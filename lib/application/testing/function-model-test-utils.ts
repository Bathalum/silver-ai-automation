// Function Model Test Utilities - Application Layer
// This file provides comprehensive testing utilities for the function model architecture
// Supporting unit tests, integration tests, and end-to-end tests across all layers

import { FunctionModelNode } from '../../domain/entities/function-model-node-types'
import { FunctionModel } from '../../domain/entities/function-model-types'
import { FunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { FunctionModelVersionRepository } from '../../infrastructure/repositories/function-model-version-repository'
import { TransactionManagementService } from '../../infrastructure/services/transaction-management-service'
import { AuditService } from '../../infrastructure/services/audit-service'
import { FunctionModelSaveUseCases } from '../use-cases/function-model-save-use-cases'
import { FunctionModelSaveService } from '../../domain/services/function-model-save-service'

// Test Data Factories

export interface TestFunctionModelData {
  id: string
  name: string
  description: string
  version: string
  status: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface TestFunctionModelNodeData {
  id: string
  modelId: string
  type: string
  name: string
  description: string
  position: { x: number; y: number }
  data: any
  createdAt: Date
  updatedAt: Date
}

export interface TestFunctionModelVersionData {
  id: string
  modelId: string
  version: string
  changeSummary: string
  createdAt: Date
  createdBy: string
  data: any
}

export interface TestAuditLogData {
  id: string
  modelId: string
  operation: string
  status: string
  details: any
  createdAt: Date
  createdBy: string
}

/**
 * Factory for creating test function model data
 */
export class FunctionModelTestDataFactory {
  private static counter = 0

  static createTestFunctionModel(overrides?: Partial<TestFunctionModelData>): TestFunctionModelData {
    this.counter++
    const baseData: TestFunctionModelData = {
      id: `test-model-${this.counter}`,
      name: `Test Function Model ${this.counter}`,
      description: `Test description for model ${this.counter}`,
      version: '1.0.0',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user'
    }

    return { ...baseData, ...overrides }
  }

  static createTestFunctionModelNode(overrides?: Partial<TestFunctionModelNodeData>): TestFunctionModelNodeData {
    this.counter++
    const baseData: TestFunctionModelNodeData = {
      id: `test-node-${this.counter}`,
      modelId: `test-model-${this.counter}`,
      type: 'stage',
      name: `Test Node ${this.counter}`,
      description: `Test description for node ${this.counter}`,
      position: { x: 100, y: 100 },
      data: { customField: 'test-value' },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return { ...baseData, ...overrides }
  }

  static createTestFunctionModelVersion(overrides?: Partial<TestFunctionModelVersionData>): TestFunctionModelVersionData {
    this.counter++
    const baseData: TestFunctionModelVersionData = {
      id: `test-version-${this.counter}`,
      modelId: `test-model-${this.counter}`,
      version: '1.0.0',
      changeSummary: `Test version ${this.counter}`,
      createdAt: new Date(),
      createdBy: 'test-user',
      data: { nodes: [], edges: [] }
    }

    return { ...baseData, ...overrides }
  }

  static createTestAuditLog(overrides?: Partial<TestAuditLogData>): TestAuditLogData {
    this.counter++
    const baseData: TestAuditLogData = {
      id: `test-audit-${this.counter}`,
      modelId: `test-model-${this.counter}`,
      operation: 'save',
      status: 'success',
      details: { test: 'data' },
      createdAt: new Date(),
      createdBy: 'test-user'
    }

    return { ...baseData, ...overrides }
  }

  static createTestFunctionModelArray(count: number): TestFunctionModelData[] {
    return Array.from({ length: count }, () => this.createTestFunctionModel())
  }

  static createTestFunctionModelNodeArray(count: number, modelId?: string): TestFunctionModelNodeData[] {
    return Array.from({ length: count }, () => 
      this.createTestFunctionModelNode(modelId ? { modelId } : undefined)
    )
  }

  static createTestFunctionModelVersionArray(count: number, modelId?: string): TestFunctionModelVersionData[] {
    return Array.from({ length: count }, () => 
      this.createTestFunctionModelVersion(modelId ? { modelId } : undefined)
    )
  }

  static resetCounter(): void {
    this.counter = 0
  }
}

// Mock Implementations

/**
 * Mock FunctionModelRepository for testing
 */
export class MockFunctionModelRepository implements FunctionModelRepository {
  private models: Map<string, TestFunctionModelData> = new Map()
  private nodes: Map<string, TestFunctionModelNodeData[]> = new Map()

  constructor(initialData?: { models?: TestFunctionModelData[], nodes?: TestFunctionModelNodeData[] }) {
    if (initialData?.models) {
      initialData.models.forEach(model => this.models.set(model.id, model))
    }
    if (initialData?.nodes) {
      initialData.nodes.forEach(node => {
        const existing = this.nodes.get(node.modelId) || []
        existing.push(node)
        this.nodes.set(node.modelId, existing)
      })
    }
  }

  async getById(id: string): Promise<FunctionModel | null> {
    const model = this.models.get(id)
    return model ? this.mapToFunctionModel(model) : null
  }

  async create(data: any): Promise<FunctionModel> {
    const model = FunctionModelTestDataFactory.createTestFunctionModel(data)
    this.models.set(model.id, model)
    return this.mapToFunctionModel(model)
  }

  async update(id: string, data: any): Promise<FunctionModel> {
    const existing = this.models.get(id)
    if (!existing) {
      throw new Error('Model not found')
    }
    const updated = { ...existing, ...data, updatedAt: new Date() }
    this.models.set(id, updated)
    return this.mapToFunctionModel(updated)
  }

  async delete(id: string): Promise<void> {
    this.models.delete(id)
    this.nodes.delete(id)
  }

  async getNodes(modelId: string): Promise<FunctionModelNode[]> {
    const nodes = this.nodes.get(modelId) || []
    return nodes.map(node => this.mapToFunctionModelNode(node))
  }

  async saveNodes(modelId: string, nodes: FunctionModelNode[]): Promise<void> {
    const testNodes = nodes.map(node => this.mapFromFunctionModelNode(node, modelId))
    this.nodes.set(modelId, testNodes)
  }

  async deleteNodes(modelId: string): Promise<void> {
    this.nodes.delete(modelId)
  }

  private mapToFunctionModel(data: TestFunctionModelData): FunctionModel {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      version: data.version,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy
    } as FunctionModel
  }

  private mapToFunctionModelNode(data: TestFunctionModelNodeData): FunctionModelNode {
    return {
      id: data.id,
      type: data.type,
      name: data.name,
      description: data.description,
      position: data.position,
      data: data.data
    } as FunctionModelNode
  }

  private mapFromFunctionModelNode(node: FunctionModelNode, modelId: string): TestFunctionModelNodeData {
    return {
      id: node.id,
      modelId,
      type: node.type,
      name: node.name,
      description: node.description,
      position: node.position,
      data: node.data,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // Test helper methods
  getStoredModels(): TestFunctionModelData[] {
    return Array.from(this.models.values())
  }

  getStoredNodes(modelId: string): TestFunctionModelNodeData[] {
    return this.nodes.get(modelId) || []
  }

  clear(): void {
    this.models.clear()
    this.nodes.clear()
  }
}

/**
 * Mock FunctionModelVersionRepository for testing
 */
export class MockFunctionModelVersionRepository implements FunctionModelVersionRepository {
  private versions: Map<string, TestFunctionModelVersionData[]> = new Map()

  constructor(initialData?: TestFunctionModelVersionData[]) {
    if (initialData) {
      initialData.forEach(version => {
        const existing = this.versions.get(version.modelId) || []
        existing.push(version)
        this.versions.set(version.modelId, existing)
      })
    }
  }

  async getVersions(modelId: string): Promise<any[]> {
    return this.versions.get(modelId) || []
  }

  async createVersion(data: any): Promise<any> {
    const version = FunctionModelTestDataFactory.createTestFunctionModelVersion(data)
    const existing = this.versions.get(version.modelId) || []
    existing.push(version)
    this.versions.set(version.modelId, existing)
    return version
  }

  async getVersion(modelId: string, version: string): Promise<any | null> {
    const versions = this.versions.get(modelId) || []
    return versions.find(v => v.version === version) || null
  }

  // Test helper methods
  getStoredVersions(modelId: string): TestFunctionModelVersionData[] {
    return this.versions.get(modelId) || []
  }

  clear(): void {
    this.versions.clear()
  }
}

/**
 * Mock TransactionManagementService for testing
 */
export class MockTransactionManagementService implements TransactionManagementService {
  private operations: any[] = []
  private isInTransaction = false

  async executeInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    this.isInTransaction = true
    try {
      const result = await operation()
      this.operations.push({ type: 'commit', timestamp: new Date() })
      return result
    } catch (error) {
      this.operations.push({ type: 'rollback', timestamp: new Date(), error })
      throw error
    } finally {
      this.isInTransaction = false
    }
  }

  async executeBatchTransaction<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
    this.isInTransaction = true
    try {
      const results = await Promise.all(operations.map(op => op()))
      this.operations.push({ type: 'batch_commit', timestamp: new Date(), count: operations.length })
      return results
    } catch (error) {
      this.operations.push({ type: 'batch_rollback', timestamp: new Date(), error })
      throw error
    } finally {
      this.isInTransaction = false
    }
  }

  async executeWithRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        if (i === maxRetries) break
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)))
      }
    }
    throw lastError!
  }

  // Test helper methods
  getOperations(): any[] {
    return this.operations
  }

  isTransactionActive(): boolean {
    return this.isInTransaction
  }

  clear(): void {
    this.operations = []
    this.isInTransaction = false
  }
}

/**
 * Mock AuditService for testing
 */
export class MockAuditService implements AuditService {
  private logs: TestAuditLogData[] = []

  async logAuditEntry(entry: any): Promise<void> {
    const log = FunctionModelTestDataFactory.createTestAuditLog(entry)
    this.logs.push(log)
  }

  async logFunctionModelSave(data: any): Promise<void> {
    const log = FunctionModelTestDataFactory.createTestAuditLog({
      operation: 'function_model_save',
      ...data
    })
    this.logs.push(log)
  }

  async logFunctionModelVersion(data: any): Promise<void> {
    const log = FunctionModelTestDataFactory.createTestAuditLog({
      operation: 'function_model_version',
      ...data
    })
    this.logs.push(log)
  }

  async logNodeOperation(data: any): Promise<void> {
    const log = FunctionModelTestDataFactory.createTestAuditLog({
      operation: 'node_operation',
      ...data
    })
    this.logs.push(log)
  }

  async logConnectionOperation(data: any): Promise<void> {
    const log = FunctionModelTestDataFactory.createTestAuditLog({
      operation: 'connection_operation',
      ...data
    })
    this.logs.push(log)
  }

  async logSystemOperation(data: any): Promise<void> {
    const log = FunctionModelTestDataFactory.createTestAuditLog({
      operation: 'system_operation',
      ...data
    })
    this.logs.push(log)
  }

  // Test helper methods
  getLogs(): TestAuditLogData[] {
    return this.logs
  }

  getLogsByOperation(operation: string): TestAuditLogData[] {
    return this.logs.filter(log => log.operation === operation)
  }

  clear(): void {
    this.logs = []
  }
}

// Test Helpers

/**
 * Test environment setup helper
 */
export class FunctionModelTestEnvironment {
  private mockRepository: MockFunctionModelRepository
  private mockVersionRepository: MockFunctionModelVersionRepository
  private mockTransactionService: MockTransactionManagementService
  private mockAuditService: MockAuditService
  private saveUseCases: FunctionModelSaveUseCases

  constructor(initialData?: {
    models?: TestFunctionModelData[]
    nodes?: TestFunctionModelNodeData[]
    versions?: TestFunctionModelVersionData[]
  }) {
    this.mockRepository = new MockFunctionModelRepository(initialData)
    this.mockVersionRepository = new MockFunctionModelVersionRepository(initialData?.versions)
    this.mockTransactionService = new MockTransactionManagementService()
    this.mockAuditService = new MockAuditService()

    this.saveUseCases = new FunctionModelSaveUseCases(
      this.mockRepository,
      this.mockVersionRepository,
      this.mockTransactionService,
      this.mockAuditService
    )
  }

  getSaveUseCases(): FunctionModelSaveUseCases {
    return this.saveUseCases
  }

  getMockRepository(): MockFunctionModelRepository {
    return this.mockRepository
  }

  getMockVersionRepository(): MockFunctionModelVersionRepository {
    return this.mockVersionRepository
  }

  getMockTransactionService(): MockTransactionManagementService {
    return this.mockTransactionService
  }

  getMockAuditService(): MockAuditService {
    return this.mockAuditService
  }

  /**
   * Setup test data for a specific test scenario
   */
  setupTestScenario(scenario: {
    model?: TestFunctionModelData
    nodes?: TestFunctionModelNodeData[]
    versions?: TestFunctionModelVersionData[]
  }): void {
    if (scenario.model) {
      this.mockRepository.create(scenario.model)
    }
    if (scenario.nodes) {
      scenario.nodes.forEach(node => {
        this.mockRepository.saveNodes(node.modelId, [this.mockRepository.mapToFunctionModelNode(node)])
      })
    }
    if (scenario.versions) {
      scenario.versions.forEach(version => {
        this.mockVersionRepository.createVersion(version)
      })
    }
  }

  /**
   * Clean up test environment
   */
  cleanup(): void {
    this.mockRepository.clear()
    this.mockVersionRepository.clear()
    this.mockTransactionService.clear()
    this.mockAuditService.clear()
    FunctionModelTestDataFactory.resetCounter()
  }

  /**
   * Get all test data for verification
   */
  getTestData(): {
    models: TestFunctionModelData[]
    nodes: TestFunctionModelNodeData[]
    versions: TestFunctionModelVersionData[]
    auditLogs: TestAuditLogData[]
    operations: any[]
  } {
    return {
      models: this.mockRepository.getStoredModels(),
      nodes: this.mockRepository.getStoredNodes('test-model-1'),
      versions: this.mockVersionRepository.getStoredVersions('test-model-1'),
      auditLogs: this.mockAuditService.getLogs(),
      operations: this.mockTransactionService.getOperations()
    }
  }
}

/**
 * Test assertion helpers
 */
export class FunctionModelTestAssertions {
  /**
   * Assert that a save operation was successful
   */
  static assertSaveSuccess(result: any): void {
    expect(result.success).toBe(true)
    expect(result.errors).toHaveLength(0)
  }

  /**
   * Assert that a save operation failed with specific errors
   */
  static assertSaveFailure(result: any, expectedErrors: string[]): void {
    expect(result.success).toBe(false)
    expectedErrors.forEach(error => {
      expect(result.errors).toContain(error)
    })
  }

  /**
   * Assert that audit logs were created for specific operations
   */
  static assertAuditLogsCreated(auditService: MockAuditService, operations: string[]): void {
    const logs = auditService.getLogs()
    operations.forEach(operation => {
      expect(logs.some(log => log.operation === operation)).toBe(true)
    })
  }

  /**
   * Assert that transaction operations were executed
   */
  static assertTransactionExecuted(transactionService: MockTransactionManagementService): void {
    const operations = transactionService.getOperations()
    expect(operations.length).toBeGreaterThan(0)
    expect(operations.some(op => op.type === 'commit' || op.type === 'batch_commit')).toBe(true)
  }

  /**
   * Assert that model data was saved correctly
   */
  static assertModelSaved(repository: MockFunctionModelRepository, modelId: string): void {
    const models = repository.getStoredModels()
    expect(models.some(model => model.id === modelId)).toBe(true)
  }

  /**
   * Assert that nodes were saved correctly
   */
  static assertNodesSaved(repository: MockFunctionModelRepository, modelId: string, expectedCount: number): void {
    const nodes = repository.getStoredNodes(modelId)
    expect(nodes).toHaveLength(expectedCount)
  }

  /**
   * Assert that versions were created correctly
   */
  static assertVersionCreated(versionRepository: MockFunctionModelVersionRepository, modelId: string, version: string): void {
    const versions = versionRepository.getStoredVersions(modelId)
    expect(versions.some(v => v.version === version)).toBe(true)
  }
}

// Integration Test Helpers

/**
 * Helper for creating integration test scenarios
 */
export class FunctionModelIntegrationTestHelper {
  private testEnvironment: FunctionModelTestEnvironment

  constructor() {
    this.testEnvironment = new FunctionModelTestEnvironment()
  }

  /**
   * Create a complete save scenario test
   */
  async testCompleteSaveScenario(modelId: string, nodes: FunctionModelNode[], edges: any[]): Promise<any> {
    const saveUseCases = this.testEnvironment.getSaveUseCases()
    
    const result = await saveUseCases.saveFunctionModel({
      modelId,
      nodes,
      edges,
      metadata: {
        changeSummary: 'Integration test save',
        author: 'test-user',
        isPublished: false
      },
      options: {
        validateBeforeSave: true,
        createBackup: false,
        updateVersion: true,
        createNewVersion: false
      }
    })

    return result
  }

  /**
   * Create a complete load scenario test
   */
  async testCompleteLoadScenario(modelId: string, version?: string): Promise<any> {
    const saveUseCases = this.testEnvironment.getSaveUseCases()
    
    const result = await saveUseCases.loadFunctionModel({
      modelId,
      version,
      options: {
        validateData: false,
        restoreFromVersion: false
      }
    })

    return result
  }

  /**
   * Create a complete version creation test
   */
  async testCompleteVersionCreation(modelId: string, nodes: FunctionModelNode[], edges: any[]): Promise<any> {
    const saveUseCases = this.testEnvironment.getSaveUseCases()
    
    const result = await saveUseCases.createFunctionModelVersion(
      modelId,
      nodes,
      edges,
      'Integration test version',
      'test-user'
    )

    return result
  }

  /**
   * Get the test environment for verification
   */
  getTestEnvironment(): FunctionModelTestEnvironment {
    return this.testEnvironment
  }

  /**
   * Clean up the test environment
   */
  cleanup(): void {
    this.testEnvironment.cleanup()
  }
}
