import { FunctionModelManagementUseCases } from '@/lib/application/use-cases/function-model-management-use-cases'
import { SupabaseFunctionModelRepository } from '@/lib/infrastructure/repositories/function-model-repository'
import { AuditService } from '@/lib/infrastructure/services/audit-service'
import { FunctionModelDependencyContainer } from '@/lib/application/di/function-model-dependency-container'
import { ApplicationException } from '@/lib/application/exceptions/application-exceptions'
import { InfrastructureException } from '@/lib/infrastructure/exceptions/infrastructure-exceptions'
import { FunctionModel, FunctionModelCreateOptions } from '@/lib/domain/entities/function-model-types'

// Mock Supabase client with proper typing
const mockSupabaseClient = {
  from: jest.fn()
}

// Mock the Supabase client creation
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

describe('Function Model Creation Flow', () => {
  let useCases: FunctionModelManagementUseCases
  let repository: SupabaseFunctionModelRepository
  let auditService: AuditService
  let dependencyContainer: FunctionModelDependencyContainer

  const mockFunctionModel: FunctionModel = {
    modelId: 'test-model-id',
    name: 'Test Function Model',
    description: 'A test function model',
    version: '1.0.0',
    status: 'draft',
    currentVersion: '1.0.0',
    versionCount: 1,
    lastSavedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAgentConfig: {},
    metadata: {},
    permissions: {}
  }

  const mockCreateOptions: FunctionModelCreateOptions = {
    name: 'Test Function Model',
    description: 'A test function model',
    status: 'draft'
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create dependency container with test configuration
    dependencyContainer = new FunctionModelDependencyContainer({
      environment: 'test',
      enableAuditLogging: true,
      enableTransactionManagement: true,
      enablePerformanceMonitoring: false,
      maxRetryAttempts: 3,
      timeoutMs: 5000
    })

    // Get services from container
    repository = dependencyContainer.getFunctionModelRepository() as SupabaseFunctionModelRepository
    auditService = dependencyContainer.getAuditService()
    useCases = dependencyContainer.getFunctionModelManagementUseCases()

    // Setup default successful mock
    setupSuccessfulMock()
  })

  function setupSuccessfulMock() {
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ 
          data: {
            model_id: mockFunctionModel.modelId,
            name: mockFunctionModel.name,
            description: mockFunctionModel.description,
            version: mockFunctionModel.version,
            status: mockFunctionModel.status,
            current_version: mockFunctionModel.currentVersion,
            version_count: mockFunctionModel.versionCount,
            last_saved_at: mockFunctionModel.lastSavedAt.toISOString(),
            created_at: mockFunctionModel.createdAt.toISOString(),
            updated_at: mockFunctionModel.updatedAt.toISOString(),
            ai_agent_config: mockFunctionModel.aiAgentConfig,
            metadata: mockFunctionModel.metadata,
            permissions: mockFunctionModel.permissions
          }, 
          error: null 
        }))
      }))
    }))

    mockSupabaseClient.from.mockReturnValue({
      insert: mockInsert,
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })
  }

  function setupErrorMock(error: any) {
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error }))
      }))
    }))

    mockSupabaseClient.from.mockReturnValue({
      insert: mockInsert
    })
  }

  function setupCustomDataMock(data: any) {
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data, error: null }))
      }))
    }))

    mockSupabaseClient.from.mockReturnValue({
      insert: mockInsert
    })
  }

  describe('FunctionModelManagementUseCases.createFunctionModel', () => {
    it('should successfully create a function model with valid options', async () => {
      // Act
      const result = await useCases.createFunctionModel(mockCreateOptions)

      // Assert
      expect(result).toBeDefined()
      expect(result.modelId).toBe(mockFunctionModel.modelId)
      expect(result.name).toBe(mockCreateOptions.name)
      expect(result.description).toBe(mockCreateOptions.description)
      expect(result.status).toBe(mockCreateOptions.status)
      expect(result.version).toBe('1.0.0') // Default version
      expect(result.currentVersion).toBe('1.0.0')
      expect(result.versionCount).toBe(1)

      // Verify repository was called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('function_models')
    })

    it('should create function model with custom options', async () => {
      // Arrange
      const customOptions: FunctionModelCreateOptions = {
        name: 'Custom Model',
        description: 'Custom description',
        version: '2.0.0',
        status: 'published',
        aiAgentConfig: { customConfig: true },
        metadata: { customMetadata: 'value' },
        permissions: { read: ['user1'], write: ['user2'] }
      }

      const customData = {
        model_id: 'custom-model-id',
        name: customOptions.name,
        description: customOptions.description,
        version: customOptions.version,
        status: customOptions.status,
        current_version: customOptions.version,
        version_count: 1,
        last_saved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_agent_config: customOptions.aiAgentConfig,
        metadata: customOptions.metadata,
        permissions: customOptions.permissions
      }

      setupCustomDataMock(customData)

      // Act
      const result = await useCases.createFunctionModel(customOptions)

      // Assert
      expect(result.name).toBe(customOptions.name)
      expect(result.description).toBe(customOptions.description)
      expect(result.version).toBe(customOptions.version)
      expect(result.status).toBe(customOptions.status)
      expect(result.aiAgentConfig).toEqual(customOptions.aiAgentConfig)
      expect(result.metadata).toEqual(customOptions.metadata)
      expect(result.permissions).toEqual(customOptions.permissions)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = { message: 'Database connection failed', code: 'DB_ERROR' }
      setupErrorMock(dbError)

      // Act & Assert
      await expect(useCases.createFunctionModel(mockCreateOptions))
        .rejects
        .toThrow(ApplicationException)
    })

    it('should handle audit logging failures without breaking main operation', async () => {
      // Arrange - Mock audit service to throw error
      const mockAuditService = {
        logFunctionModelSave: jest.fn(() => Promise.reject(new Error('Audit logging failed')))
      }
      
      // Create use cases with mocked audit service
      const useCasesWithMockAudit = new FunctionModelManagementUseCases(
        repository,
        mockAuditService as any
      )

      // Act
      const result = await useCasesWithMockAudit.createFunctionModel(mockCreateOptions)

      // Assert
      expect(result).toBeDefined()
      expect(result.modelId).toBe(mockFunctionModel.modelId)
      expect(mockAuditService.logFunctionModelSave).toHaveBeenCalledWith(
        mockFunctionModel.modelId,
        'create',
        { options: mockCreateOptions }
      )
    })
  })

  describe('SupabaseFunctionModelRepository.createFunctionModel', () => {
    it('should map database row to FunctionModel correctly', async () => {
      // Arrange
      const dbRow = {
        model_id: 'test-id',
        name: 'Test Model',
        description: 'Test Description',
        version: '1.0.0',
        status: 'draft',
        current_version: '1.0.0',
        version_count: 1,
        last_saved_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        ai_agent_config: { test: true },
        metadata: { test: 'value' },
        permissions: { read: ['user1'] }
      }

      setupCustomDataMock(dbRow)

      // Act
      const result = await repository.createFunctionModel({
        name: 'Test Model',
        description: 'Test Description',
        version: '1.0.0',
        status: 'draft',
        currentVersion: '1.0.0',
        versionCount: 1,
        lastSavedAt: new Date(),
        aiAgentConfig: { test: true },
        metadata: { test: 'value' },
        permissions: { read: ['user1'] }
      })

      // Assert
      expect(result.modelId).toBe(dbRow.model_id)
      expect(result.name).toBe(dbRow.name)
      expect(result.description).toBe(dbRow.description)
      expect(result.version).toBe(dbRow.version)
      expect(result.status).toBe(dbRow.status)
      expect(result.currentVersion).toBe(dbRow.current_version)
      expect(result.versionCount).toBe(dbRow.version_count)
      expect(result.aiAgentConfig).toEqual(dbRow.ai_agent_config)
      expect(result.metadata).toEqual(dbRow.metadata)
      expect(result.permissions).toEqual(dbRow.permissions)
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.lastSavedAt).toBeInstanceOf(Date)
    })

    it('should handle database insertion errors', async () => {
      // Arrange
      const dbError = { message: 'Insert failed', code: 'INSERT_ERROR' }
      setupErrorMock(dbError)

      // Act & Assert
      await expect(repository.createFunctionModel({
        name: 'Test Model',
        description: 'Test Description',
        version: '1.0.0',
        status: 'draft',
        currentVersion: '1.0.0',
        versionCount: 1,
        lastSavedAt: new Date(),
        aiAgentConfig: {},
        metadata: {},
        permissions: {}
      })).rejects.toThrow(InfrastructureException)
    })
  })

  describe('AuditService.logFunctionModelSave', () => {
    it('should log audit entry successfully', async () => {
      // Arrange
      const auditData = {
        modelId: 'test-model-id',
        operation: 'create',
        status: 'success',
        details: { options: mockCreateOptions },
        duration: 0
      }

      // Mock successful audit log insertion
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ error: null }))
      })

      // Act
      const result = await auditService.logFunctionModelSave(
        auditData.modelId,
        auditData.operation,
        auditData.details
      )

      // Assert
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
    })

    it('should save correct audit data structure', async () => {
      // Arrange
      const mockInsert = jest.fn(() => Promise.resolve({ error: null }))
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      })

      const testDetails = { 
        options: { 
          name: 'Test Model', 
          description: 'Test Description' 
        } 
      }

      // Act
      await auditService.logFunctionModelSave(
        'test-model-id',
        'create',
        testDetails
      )

      // Assert - Verify the exact data structure being saved
      expect(mockInsert).toHaveBeenCalledWith({
        audit_id: expect.any(String),
        table_name: 'function-model',
        operation: 'create',
        record_id: 'test-model-id',
        new_data: testDetails,
        old_data: null,
        changed_at: expect.any(String),
        changed_by: undefined
      })
    })

    it('should generate valid UUID for audit ID', async () => {
      // Arrange
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      // Mock successful audit log insertion
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ error: null }))
      })

      // Act
      const result = await auditService.logFunctionModelSave(
        'test-model-id',
        'create',
        { test: 'data' }
      )

      // Assert
      expect(result).toMatch(uuidRegex)
    })

    it('should handle audit logging errors gracefully', async () => {
      // Arrange
      const dbError = { message: 'Audit log insertion failed', code: 'AUDIT_ERROR' }
      
      // Mock the audit service to throw an error
      const mockAuditService = {
        logFunctionModelSave: jest.fn(() => Promise.reject(new InfrastructureException(
          'Failed to log audit entry: Audit log insertion failed',
          'AUDIT_LOG_ERROR',
          500
        )))
      }
      
      // Create use cases with mocked audit service
      const useCasesWithMockAudit = new FunctionModelManagementUseCases(
        repository,
        mockAuditService as any
      )

      // Act - The audit error should be caught and logged, but the main operation should succeed
      const result = await useCasesWithMockAudit.createFunctionModel(mockCreateOptions)

      // Assert - The main operation should succeed despite audit failure
      expect(result).toBeDefined()
      expect(result.modelId).toBe(mockFunctionModel.modelId)
      expect(mockAuditService.logFunctionModelSave).toHaveBeenCalled()
    })

    it('should log different operation types correctly', async () => {
      // Arrange
      const mockInsert = jest.fn(() => Promise.resolve({ error: null }))
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      })

      const operations = ['create', 'update', 'delete', 'version', 'restore']

      // Act & Assert
      for (const operation of operations) {
        await auditService.logFunctionModelSave(
          'test-model-id',
          operation,
          { test: 'data' }
        )

        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            operation: operation,
            table_name: 'function-model',
            record_id: 'test-model-id'
          })
        )
      }
    })
  })

  describe('AuditService - Additional Functionality', () => {
    it('should retrieve audit logs for a model', async () => {
      // Arrange
      const mockAuditLogs = [
        {
          audit_id: 'audit-1',
          table_name: 'function-model',
          operation: 'create',
          record_id: 'test-model-id',
          new_data: { name: 'Test Model' },
          old_data: null,
          changed_at: '2024-01-01T00:00:00Z',
          changed_by: 'user-1'
        },
        {
          audit_id: 'audit-2',
          table_name: 'function-model',
          operation: 'update',
          record_id: 'test-model-id',
          new_data: { name: 'Updated Model' },
          old_data: { name: 'Test Model' },
          changed_at: '2024-01-02T00:00:00Z',
          changed_by: 'user-1'
        }
      ]

      // Mock the query chain
      const mockQuery: any = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        order: jest.fn(() => Promise.resolve({ data: mockAuditLogs, error: null }))
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      // Act
      const result = await auditService.getResourceAuditLogs('function-model', 'test-model-id', 10)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].auditId).toBe('audit-1')
      expect(result[0].operation).toBe('create')
      expect(result[1].auditId).toBe('audit-2')
      expect(result[1].operation).toBe('update')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
    })

    it('should get audit statistics', async () => {
      // Arrange
      const mockStats = {
        totalOperations: 100,
        successRate: 0.95,
        averageDuration: 150,
        operationsByType: { create: 30, update: 50, delete: 20 },
        operationsByUser: { 'user-1': 60, 'user-2': 40 },
        operationsByResource: { 'function-model': 80, 'knowledge-base': 20 },
        errorRate: 0.05,
        criticalOperations: 10
      }

      // Mock the query chain for stats
      const mockQuery: any = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      // Act
      const result = await auditService.getAuditStats(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      // Assert
      expect(result).toBeDefined()
      expect(result.totalOperations).toBeGreaterThanOrEqual(0)
      expect(result.successRate).toBeGreaterThanOrEqual(0)
      expect(result.successRate).toBeLessThanOrEqual(100)
    })

    it('should cleanup old audit logs', async () => {
      // Arrange
      const mockDeletedLogs = [
        { audit_id: 'old-audit-1' },
        { audit_id: 'old-audit-2' }
      ]

      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn(() => ({
          lt: jest.fn(() => ({
            select: jest.fn(() => Promise.resolve({ data: mockDeletedLogs, error: null }))
          }))
        }))
      })

      // Act
      const deletedCount = await auditService.cleanupOldAuditLogs()

      // Assert
      expect(deletedCount).toBe(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
    })

    it('should query audit logs with filters', async () => {
      // Arrange
      const mockQueryResult = [
        {
          audit_id: 'filtered-audit-1',
          table_name: 'function-model',
          operation: 'create',
          record_id: 'test-model-id',
          new_data: { name: 'Filtered Model' },
          old_data: null,
          changed_at: '2024-01-01T00:00:00Z',
          changed_by: 'user-1'
        }
      ]

      // Mock the query chain for filtered queries
      const mockQuery: any = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        order: jest.fn(() => Promise.resolve({ data: mockQueryResult, error: null }))
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      // Act
      const result = await auditService.queryAuditLogs({
        userId: 'user-1',
        resource: 'function-model',
        resourceId: 'test-model-id',
        action: 'create',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 10
      })

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].auditId).toBe('filtered-audit-1')
      expect(result[0].operation).toBe('create')
    })

    it('should handle audit log retrieval errors', async () => {
      // Arrange
      const dbError = { message: 'Failed to retrieve audit logs', code: 'QUERY_ERROR' }
      
      // Mock the query chain that returns an error
      const mockQuery: any = {
        select: jest.fn(() => mockQuery),
        eq: jest.fn(() => mockQuery),
        gte: jest.fn(() => mockQuery),
        lte: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        order: jest.fn(() => Promise.resolve({ data: null, error: dbError }))
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      // Act & Assert
      await expect(auditService.getResourceAuditLogs('function-model', 'test-model-id'))
        .rejects
        .toThrow(InfrastructureException)
    })
  })

  describe('Dependency Container Integration', () => {
    it('should properly inject dependencies', () => {
      // Assert
      expect(dependencyContainer.getFunctionModelRepository()).toBeInstanceOf(SupabaseFunctionModelRepository)
      expect(dependencyContainer.getAuditService()).toBeInstanceOf(AuditService)
      expect(dependencyContainer.getFunctionModelManagementUseCases()).toBeInstanceOf(FunctionModelManagementUseCases)
    })

    it('should validate dependencies correctly', () => {
      // Act
      const validation = dependencyContainer.validateDependencies()

      // Assert
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should provide correct configuration', () => {
      // Act
      const config = dependencyContainer.getConfig()

      // Assert
      expect(config.environment).toBe('test')
      expect(config.enableAuditLogging).toBe(true)
      expect(config.enableTransactionManagement).toBe(true)
      expect(config.enablePerformanceMonitoring).toBe(false)
      expect(config.maxRetryAttempts).toBe(3)
      expect(config.timeoutMs).toBe(5000)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing required fields', async () => {
      // Arrange
      const invalidOptions = {
        name: '', // Empty name should be invalid
        description: 'Test'
      } as FunctionModelCreateOptions

      // Mock database to reject empty name
      setupErrorMock({ message: 'Name cannot be empty', code: 'VALIDATION_ERROR' })

      // Act & Assert
      await expect(useCases.createFunctionModel(invalidOptions))
        .rejects
        .toThrow()
    })

    it('should handle null/undefined values gracefully', async () => {
      // Arrange
      const optionsWithNulls: FunctionModelCreateOptions = {
        name: 'Test Model',
        description: undefined,
        status: undefined,
        aiAgentConfig: undefined,
        metadata: undefined,
        permissions: undefined
      }

      // Mock database to return the model with default values
      const defaultData = {
        model_id: 'test-model-id',
        name: optionsWithNulls.name,
        description: '', // Default empty string
        version: '1.0.0',
        status: 'draft', // Default status
        current_version: '1.0.0',
        version_count: 1,
        last_saved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_agent_config: {}, // Default empty object
        metadata: {}, // Default empty object
        permissions: {} // Default empty object
      }

      setupCustomDataMock(defaultData)

      // Act
      const result = await useCases.createFunctionModel(optionsWithNulls)

      // Assert
      expect(result).toBeDefined()
      expect(result.description).toBe('')
      expect(result.status).toBe('draft')
      expect(result.aiAgentConfig).toEqual({})
      expect(result.metadata).toEqual({})
      expect(result.permissions).toEqual({})
    })

    it('should handle concurrent creation attempts', async () => {
      // Arrange
      const promises = Array(3).fill(null).map(() => 
        useCases.createFunctionModel(mockCreateOptions)
      )

      // Act
      const results = await Promise.all(promises)

      // Assert
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.modelId).toBeDefined()
        expect(result.name).toBe(mockCreateOptions.name)
      })
    })
  })

  describe('Integration Test - Full Creation Flow', () => {
    it('should complete full creation flow without errors', async () => {
      // Arrange
      const testOptions: FunctionModelCreateOptions = {
        name: 'Integration Test Model',
        description: 'Testing full creation flow',
        status: 'draft',
        aiAgentConfig: { integration: true },
        metadata: { testType: 'integration' },
        permissions: { owner: 'test-user' }
      }

      // Mock database to return the test model data
      const testData = {
        model_id: 'integration-test-id',
        name: testOptions.name,
        description: testOptions.description,
        version: '1.0.0',
        status: testOptions.status,
        current_version: '1.0.0',
        version_count: 1,
        last_saved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_agent_config: testOptions.aiAgentConfig,
        metadata: testOptions.metadata,
        permissions: testOptions.permissions
      }

      // Setup proper mock structure for integration test
      const mockInsert = jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: testData, error: null }))
        }))
      }))

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })

      // Act
      const result = await useCases.createFunctionModel(testOptions)

      // Assert
      expect(result).toBeDefined()
      expect(result.modelId).toBeDefined()
      expect(result.name).toBe(testOptions.name)
      expect(result.description).toBe(testOptions.description)
      expect(result.status).toBe(testOptions.status)
      expect(result.aiAgentConfig).toEqual(testOptions.aiAgentConfig)
      expect(result.metadata).toEqual(testOptions.metadata)
      expect(result.permissions).toEqual(testOptions.permissions)
      expect(result.version).toBe('1.0.0')
      expect(result.currentVersion).toBe('1.0.0')
      expect(result.versionCount).toBe(1)
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.lastSavedAt).toBeInstanceOf(Date)

      // Verify database operations were called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('function_models')
      // Note: Audit logging is handled separately and may not be called in all test scenarios
    })
  })
})
