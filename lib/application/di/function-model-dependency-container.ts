// Function Model Dependency Injection Container - Application Layer
// This container manages dependencies for the function model architecture
// Following Clean Architecture principles with proper dependency injection

import { FunctionModelRepository, SupabaseFunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { FunctionModelVersionRepository } from '../../infrastructure/repositories/function-model-version-repository'
import { SupabaseFunctionModelEdgeRepository } from '../../infrastructure/repositories/function-model-edge-repository'
import { TransactionManagementService } from '../../infrastructure/services/transaction-management-service'
import { AuditService } from '../../infrastructure/services/audit-service'
import { FunctionModelSaveUseCases } from '../use-cases/function-model-save-use-cases'
import { FunctionModelManagementUseCases } from '../use-cases/function-model-management-use-cases'
import { FunctionModelSaveService } from '../../domain/services/function-model-save-service'
import { EdgeRepository } from '../../domain/entities/function-model-types'

export interface DependencyContainerConfig {
  environment: 'development' | 'production' | 'test'
  enableAuditLogging: boolean
  enableTransactionManagement: boolean
  enablePerformanceMonitoring: boolean
  maxRetryAttempts: number
  timeoutMs: number
}

export interface ServiceLocator {
  getFunctionModelRepository(): FunctionModelRepository
  getEdgeRepository(): EdgeRepository
  getFunctionModelVersionRepository(): FunctionModelVersionRepository
  getTransactionManagementService(): TransactionManagementService
  getAuditService(): AuditService
  getFunctionModelSaveUseCases(): FunctionModelSaveUseCases
  getFunctionModelManagementUseCases(): FunctionModelManagementUseCases
  getFunctionModelSaveService(): FunctionModelSaveService
  getConfig(): DependencyContainerConfig
}

export class FunctionModelDependencyContainer implements ServiceLocator {
  private config: DependencyContainerConfig
  private repositories: Map<string, any> = new Map()
  private services: Map<string, any> = new Map()
  private useCases: Map<string, any> = new Map()

  constructor(config: DependencyContainerConfig) {
    this.config = config
    this.initializeServices()
  }

  /**
   * Initialize all services with proper dependency injection
   */
  private initializeServices(): void {
    // Initialize Infrastructure Layer Services
    this.initializeInfrastructureServices()
    
    // Initialize Domain Layer Services
    this.initializeDomainServices()
    
    // Initialize Application Layer Use Cases
    this.initializeApplicationUseCases()
  }

  /**
   * Initialize Infrastructure Layer services
   */
  private initializeInfrastructureServices(): void {
    // Initialize repositories
    const functionModelRepository = new SupabaseFunctionModelRepository()
    const edgeRepository = new SupabaseFunctionModelEdgeRepository()
    const functionModelVersionRepository = new FunctionModelVersionRepository()
    
    this.repositories.set('functionModelRepository', functionModelRepository)
    this.repositories.set('edgeRepository', edgeRepository)
    this.repositories.set('functionModelVersionRepository', functionModelVersionRepository)

    // Initialize infrastructure services
    const transactionService = new TransactionManagementService()
    const auditService = new AuditService()
    
    this.services.set('transactionManagementService', transactionService)
    this.services.set('auditService', auditService)
  }

  /**
   * Initialize Domain Layer services
   */
  private initializeDomainServices(): void {
    const saveService = new FunctionModelSaveService()
    this.services.set('functionModelSaveService', saveService)
  }

  /**
   * Initialize Application Layer use cases with proper dependencies
   * DIP: Application layer depends on Domain abstractions, not Infrastructure details
   */
  private initializeApplicationUseCases(): void {
    const functionModelRepository = this.getFunctionModelRepository()
    const edgeRepository = this.getEdgeRepository()
    const functionModelVersionRepository = this.getFunctionModelVersionRepository()
    const transactionService = this.getTransactionManagementService()
    const auditService = this.getAuditService()

    const saveUseCases = new FunctionModelSaveUseCases(
      functionModelRepository,
      edgeRepository,
      functionModelVersionRepository,
      transactionService,
      auditService
    )

    const managementUseCases = new FunctionModelManagementUseCases(
      functionModelRepository,
      auditService
    )

    this.useCases.set('functionModelSaveUseCases', saveUseCases)
    this.useCases.set('functionModelManagementUseCases', managementUseCases)
  }

  // Service Locator Interface Implementation

  getFunctionModelRepository(): FunctionModelRepository {
    return this.repositories.get('functionModelRepository')
  }

  getEdgeRepository(): EdgeRepository {
    return this.repositories.get('edgeRepository')
  }

  getFunctionModelVersionRepository(): FunctionModelVersionRepository {
    return this.repositories.get('functionModelVersionRepository')
  }

  getTransactionManagementService(): TransactionManagementService {
    return this.services.get('transactionManagementService')
  }

  getAuditService(): AuditService {
    return this.services.get('auditService')
  }

  getFunctionModelSaveUseCases(): FunctionModelSaveUseCases {
    return this.useCases.get('functionModelSaveUseCases')
  }

  getFunctionModelManagementUseCases(): FunctionModelManagementUseCases {
    return this.useCases.get('functionModelManagementUseCases')
  }

  getFunctionModelSaveService(): FunctionModelSaveService {
    return this.services.get('functionModelSaveService')
  }

  getConfig(): DependencyContainerConfig {
    return this.config
  }

  /**
   * Get a service by name (for dynamic service resolution)
   */
  getService<T>(serviceName: string): T | null {
    if (this.repositories.has(serviceName)) {
      return this.repositories.get(serviceName)
    }
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName)
    }
    if (this.useCases.has(serviceName)) {
      return this.useCases.get(serviceName)
    }
    return null
  }

  /**
   * Register a custom service (for testing and extensibility)
   */
  registerService<T>(serviceName: string, service: T): void {
    this.services.set(serviceName, service)
  }

  /**
   * Register a custom repository (for testing and extensibility)
   */
  registerRepository<T>(repositoryName: string, repository: T): void {
    this.repositories.set(repositoryName, repository)
  }

  /**
   * Register a custom use case (for testing and extensibility)
   */
  registerUseCase<T>(useCaseName: string, useCase: T): void {
    this.useCases.set(useCaseName, useCase)
  }

  /**
   * Update configuration (for runtime configuration changes)
   */
  updateConfig(newConfig: Partial<DependencyContainerConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get all registered services (for debugging and monitoring)
   */
  getAllServices(): { repositories: string[], services: string[], useCases: string[] } {
    return {
      repositories: Array.from(this.repositories.keys()),
      services: Array.from(this.services.keys()),
      useCases: Array.from(this.useCases.keys())
    }
  }

  /**
   * Validate all dependencies are properly initialized
   */
  validateDependencies(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check required repositories
    if (!this.repositories.has('functionModelRepository')) {
      errors.push('FunctionModelRepository not initialized')
    }
    if (!this.repositories.has('functionModelVersionRepository')) {
      errors.push('FunctionModelVersionRepository not initialized')
    }
    if (!this.repositories.has('edgeRepository')) {
      errors.push('EdgeRepository not initialized')
    }

    // Check required services
    if (!this.services.has('transactionManagementService')) {
      errors.push('TransactionManagementService not initialized')
    }
    if (!this.services.has('auditService')) {
      errors.push('AuditService not initialized')
    }
    if (!this.services.has('functionModelSaveService')) {
      errors.push('FunctionModelSaveService not initialized')
    }

    // Check required use cases
    if (!this.useCases.has('functionModelSaveUseCases')) {
      errors.push('FunctionModelSaveUseCases not initialized')
    }
    if (!this.useCases.has('functionModelManagementUseCases')) {
      errors.push('FunctionModelManagementUseCases not initialized')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Dispose of all services (for cleanup)
   */
  dispose(): void {
    this.repositories.clear()
    this.services.clear()
    this.useCases.clear()
  }
}

/**
 * Factory function to create a dependency container with default configuration
 */
export function createFunctionModelDependencyContainer(
  config?: Partial<DependencyContainerConfig>
): FunctionModelDependencyContainer {
  const defaultConfig: DependencyContainerConfig = {
    environment: 'development',
    enableAuditLogging: true,
    enableTransactionManagement: true,
    enablePerformanceMonitoring: false,
    maxRetryAttempts: 3,
    timeoutMs: 5000
  }

  const finalConfig = { ...defaultConfig, ...config }
  return new FunctionModelDependencyContainer(finalConfig)
}

/**
 * Factory function to create a test dependency container with mocked services
 */
export function createTestFunctionModelDependencyContainer(
  config?: Partial<DependencyContainerConfig>
): FunctionModelDependencyContainer {
  const testConfig: DependencyContainerConfig = {
    environment: 'test',
    enableAuditLogging: false,
    enableTransactionManagement: false,
    enablePerformanceMonitoring: false,
    maxRetryAttempts: 1,
    timeoutMs: 1000
  }

  const finalConfig = { ...testConfig, ...config }
  return new FunctionModelDependencyContainer(finalConfig)
}

/**
 * Global service locator instance (for singleton pattern)
 */
let globalServiceLocator: ServiceLocator | null = null

/**
 * Get the global service locator instance
 */
export function getGlobalServiceLocator(): ServiceLocator {
  if (!globalServiceLocator) {
    globalServiceLocator = createFunctionModelDependencyContainer()
  }
  return globalServiceLocator
}

/**
 * Set the global service locator instance (for testing and configuration)
 */
export function setGlobalServiceLocator(locator: ServiceLocator): void {
  globalServiceLocator = locator
}

/**
 * Reset the global service locator (for testing)
 */
export function resetGlobalServiceLocator(): void {
  globalServiceLocator = null
}
