/**
 * Result Architectural Boundary Enforcement Specification
 * 
 * These tests define how the Result pattern enforces Clean Architecture
 * boundaries and serves as the foundation for all layer interactions.
 * 
 * Tests FAIL FIRST to define architectural contracts that must be
 * implemented across Domain, Application, and Infrastructure layers.
 * 
 * Critical Architectural Responsibilities:
 * 1. Domain Layer: Results encapsulate business rule validation
 * 2. Application Layer: Results compose domain operations safely  
 * 3. Infrastructure Layer: Results handle external system failures
 * 4. Interface Layer: Results prevent exception propagation to UI
 * 5. All Layers: Results enforce explicit error handling
 * 
 * These tests serve as:
 * - Architectural compliance specification
 * - Template for proper layer interaction patterns
 * - Boundary filter preventing architectural violations
 * - Safety net for Clean Architecture principles
 * - Guide for fixing existing architectural violations
 */

import { describe, expect, it, test } from '@jest/globals';
import { Result } from '../../../../lib/domain/shared/result';

/**
 * PHASE 1: Domain Layer Boundary Enforcement
 * Results MUST encapsulate all business rule validation and domain logic
 */
describe('Domain Layer Result Boundary Enforcement', () => {
  
  describe('Domain Entity Result Contract', () => {
    
    test('DomainEntity_BusinessRuleValidation_MustReturnResultsForAllOperations', () => {
      // This test defines how domain entities MUST use Results for business logic
      
      // Arrange - Domain Entity with business rules
      interface FunctionModelData {
        id: string;
        name: string;
        version: string;
        status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      }
      
      class FunctionModel {
        private constructor(private data: FunctionModelData) {}
        
        static create(name: string, version: string): Result<FunctionModel> {
          // CRITICAL: Domain entities MUST validate business rules via Results
          
          // Business Rule: Name validation
          if (!name?.trim()) {
            return Result.fail<FunctionModel>('Function model name is required');
          }
          if (name.trim().length < 3) {
            return Result.fail<FunctionModel>('Function model name must be at least 3 characters');
          }
          if (name.trim().length > 100) {
            return Result.fail<FunctionModel>('Function model name cannot exceed 100 characters');
          }
          if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
            return Result.fail<FunctionModel>('Function model name contains invalid characters');
          }
          
          // Business Rule: Version validation
          if (!version?.trim()) {
            return Result.fail<FunctionModel>('Function model version is required');
          }
          if (!/^\d+\.\d+\.\d+$/.test(version.trim())) {
            return Result.fail<FunctionModel>('Function model version must follow semantic versioning (x.y.z)');
          }
          
          const data: FunctionModelData = {
            id: `fm-${Date.now()}`,
            name: name.trim(),
            version: version.trim(),
            status: 'DRAFT'
          };
          
          return Result.ok(new FunctionModel(data));
        }
        
        publish(): Result<{ status: 'PUBLISHED'; publishedAt: Date }> {
          // Business Rule: Can only publish draft models
          if (this.data.status !== 'DRAFT') {
            return Result.fail<{ status: 'PUBLISHED'; publishedAt: Date }>(
              `Cannot publish function model with status ${this.data.status}. Only DRAFT models can be published.`
            );
          }
          
          // Business Rule: Must have valid name and version for publishing
          if (!this.data.name || !this.data.version) {
            return Result.fail<{ status: 'PUBLISHED'; publishedAt: Date }>(
              'Cannot publish function model with incomplete data'
            );
          }
          
          this.data.status = 'PUBLISHED';
          return Result.ok({ status: 'PUBLISHED', publishedAt: new Date() });
        }
        
        archive(): Result<{ status: 'ARCHIVED'; archivedAt: Date }> {
          // Business Rule: Cannot archive already archived models
          if (this.data.status === 'ARCHIVED') {
            return Result.fail<{ status: 'ARCHIVED'; archivedAt: Date }>(
              'Function model is already archived'
            );
          }
          
          this.data.status = 'ARCHIVED';
          return Result.ok({ status: 'ARCHIVED', archivedAt: new Date() });
        }
        
        updateName(newName: string): Result<{ name: string; updatedAt: Date }> {
          // Business Rule: Cannot update published models
          if (this.data.status === 'PUBLISHED') {
            return Result.fail<{ name: string; updatedAt: Date }>(
              'Cannot update name of published function model'
            );
          }
          
          // Business Rule: Name validation (same as creation)
          if (!newName?.trim()) {
            return Result.fail<{ name: string; updatedAt: Date }>('Function model name is required');
          }
          if (newName.trim().length < 3) {
            return Result.fail<{ name: string; updatedAt: Date }>('Function model name must be at least 3 characters');
          }
          if (!/^[a-zA-Z0-9\s\-_]+$/.test(newName.trim())) {
            return Result.fail<{ name: string; updatedAt: Date }>('Function model name contains invalid characters');
          }
          
          this.data.name = newName.trim();
          return Result.ok({ name: this.data.name, updatedAt: new Date() });
        }
        
        getName(): string { return this.data.name; }
        getVersion(): string { return this.data.version; }
        getStatus(): FunctionModelData['status'] { return this.data.status; }
        getId(): string { return this.data.id; }
      }
      
      // Act & Assert - Valid entity creation
      const createResult = FunctionModel.create('Test Function Model', '1.0.0');
      expect(createResult.isSuccess).toBe(true);
      
      if (createResult.isSuccess) {
        const model = createResult.value;
        expect(model.getName()).toBe('Test Function Model');
        expect(model.getVersion()).toBe('1.0.0');
        expect(model.getStatus()).toBe('DRAFT');
        expect(model.getId()).toMatch(/^fm-\d+$/);
      }
      
      // Act & Assert - Invalid name creation
      const invalidNameResult = FunctionModel.create('', '1.0.0');
      expect(invalidNameResult.isFailure).toBe(true);
      
      if (invalidNameResult.isFailure) {
        expect(invalidNameResult.error).toBe('Function model name is required');
      }
      
      // Act & Assert - Invalid version creation
      const invalidVersionResult = FunctionModel.create('Valid Name', 'invalid-version');
      expect(invalidVersionResult.isFailure).toBe(true);
      
      if (invalidVersionResult.isFailure) {
        expect(invalidVersionResult.error).toBe('Function model version must follow semantic versioning (x.y.z)');
      }
      
      // Act & Assert - Business operation success
      const model = createResult.isSuccess ? createResult.value : null;
      if (model) {
        const publishResult = model.publish();
        expect(publishResult.isSuccess).toBe(true);
        
        if (publishResult.isSuccess) {
          expect(publishResult.value.status).toBe('PUBLISHED');
          expect(publishResult.value.publishedAt).toBeInstanceOf(Date);
          expect(model.getStatus()).toBe('PUBLISHED');
        }
        
        // Act & Assert - Business rule violation (cannot update published model)
        const updateResult = model.updateName('New Name');
        expect(updateResult.isFailure).toBe(true);
        
        if (updateResult.isFailure) {
          expect(updateResult.error).toBe('Cannot update name of published function model');
        }
      }
    });
    
    test('DomainValueObject_Validation_MustReturnResultsForCreation', () => {
      // This test defines how domain value objects MUST use Results
      
      // Arrange - Domain Value Object
      class NodeId {
        private constructor(private value: string) {}
        
        static create(value: string): Result<NodeId> {
          // Value Object Rule: Must be non-empty string
          if (!value?.trim()) {
            return Result.fail<NodeId>('Node ID cannot be empty');
          }
          
          // Value Object Rule: Must follow specific format
          if (!/^node-[a-zA-Z0-9\-_]{8,32}$/.test(value.trim())) {
            return Result.fail<NodeId>('Node ID must follow format: node-{8-32 alphanumeric characters}');
          }
          
          // Value Object Rule: Must not contain forbidden patterns
          const forbidden = ['admin', 'system', 'root', 'null', 'undefined'];
          if (forbidden.some(term => value.toLowerCase().includes(term))) {
            return Result.fail<NodeId>('Node ID cannot contain reserved terms');
          }
          
          return Result.ok(new NodeId(value.trim()));
        }
        
        equals(other: NodeId): boolean {
          return this.value === other.value;
        }
        
        toString(): string {
          return this.value;
        }
      }
      
      class ModelName {
        private constructor(private value: string) {}
        
        static create(value: string): Result<ModelName> {
          // Value Object Rule: Must be valid name
          if (!value?.trim()) {
            return Result.fail<ModelName>('Model name cannot be empty');
          }
          if (value.trim().length < 3) {
            return Result.fail<ModelName>('Model name must be at least 3 characters');
          }
          if (value.trim().length > 100) {
            return Result.fail<ModelName>('Model name cannot exceed 100 characters');
          }
          if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(value.trim())) {
            return Result.fail<ModelName>('Model name contains invalid characters');
          }
          
          return Result.ok(new ModelName(value.trim()));
        }
        
        toString(): string {
          return this.value;
        }
      }
      
      // Act & Assert - Valid value object creation
      const validNodeIdResult = NodeId.create('node-test123456789');
      expect(validNodeIdResult.isSuccess).toBe(true);
      
      if (validNodeIdResult.isSuccess) {
        expect(validNodeIdResult.value.toString()).toBe('node-test123456789');
      }
      
      const validModelNameResult = ModelName.create('Test Model Name');
      expect(validModelNameResult.isSuccess).toBe(true);
      
      if (validModelNameResult.isSuccess) {
        expect(validModelNameResult.value.toString()).toBe('Test Model Name');
      }
      
      // Act & Assert - Invalid value object creation
      const invalidNodeIdResult = NodeId.create('invalid-format');
      expect(invalidNodeIdResult.isFailure).toBe(true);
      
      if (invalidNodeIdResult.isFailure) {
        expect(invalidNodeIdResult.error).toBe('Node ID must follow format: node-{8-32 alphanumeric characters}');
      }
      
      const reservedNodeIdResult = NodeId.create('node-admin12345678');
      expect(reservedNodeIdResult.isFailure).toBe(true);
      
      if (reservedNodeIdResult.isFailure) {
        expect(reservedNodeIdResult.error).toBe('Node ID cannot contain reserved terms');
      }
    });
  });
  
  describe('Domain Service Result Contract', () => {
    
    test('DomainService_BusinessLogicComposition_MustComposeResultsCorrectly', () => {
      // This test defines how domain services MUST compose business operations
      
      // Arrange - Domain Service with complex business logic
      interface ValidationContext {
        entityId: string;
        operationType: 'CREATE' | 'UPDATE' | 'DELETE';
        userRole: 'ADMIN' | 'USER' | 'VIEWER';
      }
      
      interface EntityData {
        name: string;
        category: string;
        value: number;
      }
      
      class BusinessValidationService {
        validatePermissions(context: ValidationContext): Result<{ authorized: boolean }> {
          // Business Rule: Permission validation
          if (context.operationType === 'DELETE' && context.userRole !== 'ADMIN') {
            return Result.fail<{ authorized: boolean }>('Only administrators can delete entities');
          }
          if (context.operationType === 'UPDATE' && context.userRole === 'VIEWER') {
            return Result.fail<{ authorized: boolean }>('Viewers cannot modify entities');
          }
          if (!context.entityId?.trim()) {
            return Result.fail<{ authorized: boolean }>('Entity ID is required for permission validation');
          }
          
          return Result.ok({ authorized: true });
        }
        
        validateBusinessRules(data: EntityData): Result<{ valid: boolean }> {
          // Business Rule: Data validation
          if (!data.name?.trim()) {
            return Result.fail<{ valid: boolean }>('Entity name is required');
          }
          if (data.name.trim().length < 3) {
            return Result.fail<{ valid: boolean }>('Entity name must be at least 3 characters');
          }
          
          // Business Rule: Category validation
          const allowedCategories = ['standard', 'premium', 'enterprise'];
          if (!allowedCategories.includes(data.category?.toLowerCase())) {
            return Result.fail<{ valid: boolean }>(`Entity category must be one of: ${allowedCategories.join(', ')}`);
          }
          
          // Business Rule: Value validation
          if (typeof data.value !== 'number' || data.value < 0) {
            return Result.fail<{ valid: boolean }>('Entity value must be a positive number');
          }
          if (data.value > 1000000) {
            return Result.fail<{ valid: boolean }>('Entity value exceeds maximum allowed limit');
          }
          
          return Result.ok({ valid: true });
        }
        
        validateCompleteOperation(context: ValidationContext, data: EntityData): Result<{ validated: EntityData }> {
          // CRITICAL: This demonstrates proper Result composition in domain services
          return this.validatePermissions(context)
            .flatMap(permissionResult => {
              if (!permissionResult.authorized) {
                return Result.fail<{ validated: EntityData }>('Operation not authorized');
              }
              
              return this.validateBusinessRules(data)
                .map(businessResult => ({
                  validated: {
                    name: data.name.trim(),
                    category: data.category.toLowerCase(),
                    value: data.value
                  }
                }));
            });
        }
      }
      
      const service = new BusinessValidationService();
      
      // Act & Assert - Valid complete operation
      const validContext: ValidationContext = {
        entityId: 'entity-123',
        operationType: 'CREATE',
        userRole: 'ADMIN'
      };
      
      const validData: EntityData = {
        name: 'Test Entity',
        category: 'premium',
        value: 500
      };
      
      const validResult = service.validateCompleteOperation(validContext, validData);
      expect(validResult.isSuccess).toBe(true);
      
      if (validResult.isSuccess) {
        expect(validResult.value.validated.name).toBe('Test Entity');
        expect(validResult.value.validated.category).toBe('premium');
        expect(validResult.value.validated.value).toBe(500);
      }
      
      // Act & Assert - Permission failure propagation
      const unauthorizedContext: ValidationContext = {
        entityId: 'entity-123',
        operationType: 'DELETE',
        userRole: 'USER'
      };
      
      const permissionFailureResult = service.validateCompleteOperation(unauthorizedContext, validData);
      expect(permissionFailureResult.isFailure).toBe(true);
      
      if (permissionFailureResult.isFailure) {
        expect(permissionFailureResult.error).toBe('Only administrators can delete entities');
      }
      
      // Act & Assert - Business rule failure propagation
      const invalidData: EntityData = {
        name: '',
        category: 'premium',
        value: 500
      };
      
      const businessFailureResult = service.validateCompleteOperation(validContext, invalidData);
      expect(businessFailureResult.isFailure).toBe(true);
      
      if (businessFailureResult.isFailure) {
        expect(businessFailureResult.error).toBe('Entity name is required');
      }
    });
  });
});

/**
 * PHASE 2: Application Layer Boundary Enforcement
 * Results MUST compose domain operations and handle cross-cutting concerns
 */
describe('Application Layer Result Boundary Enforcement', () => {
  
  describe('Use Case Result Contract', () => {
    
    test('UseCase_DomainOperationComposition_MustPreserveDomainBoundaries', () => {
      // This test defines how use cases MUST compose domain operations via Results
      
      // Arrange - Mock Domain Services (normally injected via DI)
      interface DomainEntity {
        id: string;
        name: string;
        status: 'ACTIVE' | 'INACTIVE';
      }
      
      interface IDomainValidationService {
        validateEntity(data: { name: string }): Result<{ validatedData: { name: string } }>;
      }
      
      interface IDomainEntityRepository {
        save(entity: DomainEntity): Result<{ savedEntity: DomainEntity }>;
        findById(id: string): Result<{ entity: DomainEntity | null }>;
      }
      
      interface IEventPublisher {
        publish(event: { type: string; data: any }): Result<{ published: boolean }>;
      }
      
      // Application Use Case
      class CreateEntityUseCase {
        constructor(
          private validationService: IDomainValidationService,
          private repository: IDomainEntityRepository,
          private eventPublisher: IEventPublisher
        ) {}
        
        execute(command: { name: string }): Result<{ entityId: string; created: Date }> {
          // CRITICAL: Use cases MUST compose domain operations via Result chains
          return this.validationService.validateEntity({ name: command.name })
            .flatMap(validationResult => {
              // Create domain entity
              const entity: DomainEntity = {
                id: `entity-${Date.now()}`,
                name: validationResult.validatedData.name,
                status: 'ACTIVE'
              };
              
              return this.repository.save(entity)
                .flatMap(saveResult => 
                  this.eventPublisher.publish({
                    type: 'EntityCreated',
                    data: { entityId: saveResult.savedEntity.id, name: saveResult.savedEntity.name }
                  })
                  .map(publishResult => ({
                    entityId: saveResult.savedEntity.id,
                    created: new Date()
                  }))
                );
            });
        }
      }
      
      // Mock implementations
      const mockValidationService: IDomainValidationService = {
        validateEntity: jest.fn()
      };
      
      const mockRepository: IDomainEntityRepository = {
        save: jest.fn(),
        findById: jest.fn()
      };
      
      const mockEventPublisher: IEventPublisher = {
        publish: jest.fn()
      };
      
      // Configure successful mocks
      (mockValidationService.validateEntity as jest.Mock).mockReturnValue(
        Result.ok({ validatedData: { name: 'Test Entity' } })
      );
      
      (mockRepository.save as jest.Mock).mockReturnValue(
        Result.ok({ savedEntity: { id: 'entity-123', name: 'Test Entity', status: 'ACTIVE' } })
      );
      
      (mockEventPublisher.publish as jest.Mock).mockReturnValue(
        Result.ok({ published: true })
      );
      
      const useCase = new CreateEntityUseCase(mockValidationService, mockRepository, mockEventPublisher);
      
      // Act
      const result = useCase.execute({ name: 'Test Entity' });
      
      // Assert - Success path
      expect(result.isSuccess).toBe(true);
      
      if (result.isSuccess) {
        expect(result.value.entityId).toMatch(/^entity-\d+$/);
        expect(result.value.created).toBeInstanceOf(Date);
      }
      
      // Verify all services were called
      expect(mockValidationService.validateEntity).toHaveBeenCalledWith({ name: 'Test Entity' });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();
      
      // Act & Assert - Validation failure propagation
      (mockValidationService.validateEntity as jest.Mock).mockReturnValue(
        Result.fail<{ validatedData: { name: string } }>('Validation failed: Name is required')
      );
      
      const failureResult = useCase.execute({ name: '' });
      expect(failureResult.isFailure).toBe(true);
      
      if (failureResult.isFailure) {
        expect(failureResult.error).toBe('Validation failed: Name is required');
      }
    });
    
    test('UseCase_ErrorHandlingStrategy_MustProvideRecoveryPatterns', () => {
      // This test defines how use cases MUST handle errors and provide recovery
      
      // Arrange - Use case with error recovery
      interface ExternalService {
        processData(data: any): Result<{ processed: any }>;
      }
      
      interface FallbackService {
        processDataFallback(data: any): Result<{ processed: any }>;
      }
      
      class ResilientProcessingUseCase {
        constructor(
          private primaryService: ExternalService,
          private fallbackService: FallbackService
        ) {}
        
        execute(data: any): Result<{ processed: any; source: 'primary' | 'fallback' }> {
          // CRITICAL: Use cases MUST provide error recovery via Results
          return this.primaryService.processData(data)
            .map(result => ({ ...result, source: 'primary' as const }))
            .recoverWith(() => {
              // Fallback on primary service failure
              return this.fallbackService.processDataFallback(data)
                .map(result => ({ ...result, source: 'fallback' as const }));
            });
        }
      }
      
      // Mock services
      const mockPrimaryService: ExternalService = { processData: jest.fn() };
      const mockFallbackService: FallbackService = { processDataFallback: jest.fn() };
      
      const useCase = new ResilientProcessingUseCase(mockPrimaryService, mockFallbackService);
      
      // Act & Assert - Primary success
      (mockPrimaryService.processData as jest.Mock).mockReturnValue(
        Result.ok({ processed: { data: 'primary result' } })
      );
      
      const primarySuccessResult = useCase.execute({ input: 'test' });
      expect(primarySuccessResult.isSuccess).toBe(true);
      
      if (primarySuccessResult.isSuccess) {
        expect(primarySuccessResult.value.source).toBe('primary');
        expect(primarySuccessResult.value.processed.data).toBe('primary result');
      }
      
      // Act & Assert - Primary failure, fallback success
      (mockPrimaryService.processData as jest.Mock).mockReturnValue(
        Result.fail<{ processed: any }>('Primary service failed')
      );
      
      (mockFallbackService.processDataFallback as jest.Mock).mockReturnValue(
        Result.ok({ processed: { data: 'fallback result' } })
      );
      
      const fallbackSuccessResult = useCase.execute({ input: 'test' });
      expect(fallbackSuccessResult.isSuccess).toBe(true);
      
      if (fallbackSuccessResult.isSuccess) {
        expect(fallbackSuccessResult.value.source).toBe('fallback');
        expect(fallbackSuccessResult.value.processed.data).toBe('fallback result');
      }
      
      // Act & Assert - Both services fail
      (mockFallbackService.processDataFallback as jest.Mock).mockReturnValue(
        Result.fail<{ processed: any }>('Fallback service also failed')
      );
      
      const bothFailResult = useCase.execute({ input: 'test' });
      expect(bothFailResult.isFailure).toBe(true);
      
      if (bothFailResult.isFailure) {
        expect(bothFailResult.error).toBe('Fallback service also failed');
      }
    });
  });
});

/**
 * PHASE 3: Infrastructure Layer Boundary Enforcement
 * Results MUST handle external system failures and data transformation
 */
describe('Infrastructure Layer Result Boundary Enforcement', () => {
  
  describe('Repository Result Contract', () => {
    
    test('Repository_ExternalDataAccess_MustReturnResultsForAllOperations', async () => {
      // This test defines how repositories MUST handle external system interactions
      
      // Arrange - Repository with external dependencies
      interface DatabaseClient {
        query(sql: string, params?: any[]): Promise<any>;
        execute(sql: string, params?: any[]): Promise<{ rowsAffected: number }>;
      }
      
      interface EntityRecord {
        id: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
      }
      
      interface DomainEntity {
        id: string;
        name: string;
        status: 'ACTIVE' | 'INACTIVE';
        createdAt: Date;
        updatedAt: Date;
      }
      
      class EntityRepository {
        constructor(private db: DatabaseClient) {}
        
        async findById(id: string): Promise<Result<{ entity: DomainEntity | null }>> {
          try {
            // CRITICAL: All database operations MUST be wrapped in Result
            if (!id?.trim()) {
              return Result.fail<{ entity: DomainEntity | null }>('Entity ID is required');
            }
            
            const records = await this.db.query(
              'SELECT * FROM entities WHERE id = ? AND deleted_at IS NULL',
              [id]
            );
            
            if (!Array.isArray(records)) {
              return Result.fail<{ entity: DomainEntity | null }>('Database query returned invalid format');
            }
            
            if (records.length === 0) {
              return Result.ok({ entity: null });
            }
            
            const record = records[0] as EntityRecord;
            const entity = this.mapToDomainEntity(record);
            
            return entity.map(mappedEntity => ({ entity: mappedEntity }));
            
          } catch (error) {
            return Result.fail<{ entity: DomainEntity | null }>(
              `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
        
        async save(entity: DomainEntity): Promise<Result<{ savedEntity: DomainEntity }>> {
          try {
            // CRITICAL: Validation before persistence
            if (!entity?.id?.trim()) {
              return Result.fail<{ savedEntity: DomainEntity }>('Entity ID is required for save operation');
            }
            if (!entity?.name?.trim()) {
              return Result.fail<{ savedEntity: DomainEntity }>('Entity name is required for save operation');
            }
            
            // Check if entity exists
            const existsResult = await this.findById(entity.id);
            if (existsResult.isFailure) {
              return Result.fail<{ savedEntity: DomainEntity }>(`Failed to check entity existence: ${existsResult.error}`);
            }
            
            const isUpdate = existsResult.isSuccess && existsResult.value.entity !== null;
            
            if (isUpdate) {
              // Update existing entity
              const updateResult = await this.db.execute(
                'UPDATE entities SET name = ?, status = ?, updated_at = ? WHERE id = ?',
                [entity.name, entity.status, new Date(), entity.id]
              );
              
              if (updateResult.rowsAffected === 0) {
                return Result.fail<{ savedEntity: DomainEntity }>('Entity update failed - no rows affected');
              }
            } else {
              // Create new entity
              const insertResult = await this.db.execute(
                'INSERT INTO entities (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                [entity.id, entity.name, entity.status, entity.createdAt, entity.updatedAt]
              );
              
              if (insertResult.rowsAffected === 0) {
                return Result.fail<{ savedEntity: DomainEntity }>('Entity insert failed - no rows affected');
              }
            }
            
            // Return updated entity with current timestamps
            const updatedEntity: DomainEntity = {
              ...entity,
              updatedAt: new Date()
            };
            
            return Result.ok({ savedEntity: updatedEntity });
            
          } catch (error) {
            return Result.fail<{ savedEntity: DomainEntity }>(
              `Database error during save: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
        
        private mapToDomainEntity(record: EntityRecord): Result<DomainEntity> {
          try {
            // CRITICAL: Data mapping MUST validate and transform safely
            if (!record.id) {
              return Result.fail<DomainEntity>('Database record missing required ID field');
            }
            if (!record.name) {
              return Result.fail<DomainEntity>('Database record missing required name field');
            }
            if (!['ACTIVE', 'INACTIVE'].includes(record.status)) {
              return Result.fail<DomainEntity>(`Invalid status in database record: ${record.status}`);
            }
            
            const entity: DomainEntity = {
              id: record.id,
              name: record.name,
              status: record.status as 'ACTIVE' | 'INACTIVE',
              createdAt: new Date(record.created_at),
              updatedAt: new Date(record.updated_at)
            };
            
            return Result.ok(entity);
            
          } catch (error) {
            return Result.fail<DomainEntity>(
              `Data mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }
      
      // Mock database client
      const mockDb: DatabaseClient = {
        query: jest.fn(),
        execute: jest.fn()
      };
      
      const repository = new EntityRepository(mockDb);
      
      // Act & Assert - Successful find
      (mockDb.query as jest.Mock).mockResolvedValue([
        {
          id: 'entity-123',
          name: 'Test Entity',
          status: 'ACTIVE',
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-02')
        }
      ]);
      
      const findResult = await repository.findById('entity-123');
      expect(findResult.isSuccess).toBe(true);
      
      if (findResult.isSuccess) {
        expect(findResult.value.entity).not.toBeNull();
        if (findResult.value.entity) {
          expect(findResult.value.entity.id).toBe('entity-123');
          expect(findResult.value.entity.name).toBe('Test Entity');
          expect(findResult.value.entity.status).toBe('ACTIVE');
        }
      }
      
      // Act & Assert - Database error handling
      (mockDb.query as jest.Mock).mockRejectedValue(new Error('Connection timeout'));
      
      const errorResult = await repository.findById('entity-123');
      expect(errorResult.isFailure).toBe(true);
      
      if (errorResult.isFailure) {
        expect(errorResult.error).toBe('Database error: Connection timeout');
      }
      
      // Act & Assert - Invalid input handling
      const invalidIdResult = await repository.findById('');
      expect(invalidIdResult.isFailure).toBe(true);
      
      if (invalidIdResult.isFailure) {
        expect(invalidIdResult.error).toBe('Entity ID is required');
      }
    });
  });
  
  describe('External Service Adapter Result Contract', () => {
    
    test('ExternalServiceAdapter_ThirdPartyIntegration_MustHandleAllFailureModes', async () => {
      // This test defines how external service adapters MUST handle integration failures
      
      // Arrange - External service adapter
      interface ExternalApiResponse {
        success: boolean;
        data?: any;
        error?: string;
        statusCode?: number;
      }
      
      interface HttpClient {
        get(url: string, headers?: Record<string, string>): Promise<ExternalApiResponse>;
        post(url: string, body: any, headers?: Record<string, string>): Promise<ExternalApiResponse>;
      }
      
      class ExternalDataService {
        constructor(private httpClient: HttpClient) {}
        
        async fetchProcessedData(entityId: string): Promise<Result<{ processedData: any }>> {
          try {
            // CRITICAL: Input validation before external call
            if (!entityId?.trim()) {
              return Result.fail<{ processedData: any }>('Entity ID is required for data processing');
            }
            
            // CRITICAL: External calls MUST be wrapped in Result error handling
            const response = await this.httpClient.get(
              `/api/process/${entityId}`,
              { 'Authorization': 'Bearer token' }
            );
            
            // Handle different response scenarios
            if (!response.success) {
              const errorMessage = response.error || 'External service returned failure';
              return Result.fail<{ processedData: any }>(`External service error: ${errorMessage}`);
            }
            
            if (!response.data) {
              return Result.fail<{ processedData: any }>('External service returned empty data');
            }
            
            // Validate response structure
            if (typeof response.data !== 'object' || response.data === null) {
              return Result.fail<{ processedData: any }>('External service returned invalid data format');
            }
            
            return Result.ok({ processedData: response.data });
            
          } catch (error) {
            // CRITICAL: All exceptions MUST be caught and converted to Results
            if (error instanceof Error) {
              if (error.message.includes('timeout')) {
                return Result.fail<{ processedData: any }>('External service timeout - please try again later');
              }
              if (error.message.includes('network')) {
                return Result.fail<{ processedData: any }>('Network error - please check connection');
              }
              return Result.fail<{ processedData: any }>(`External service error: ${error.message}`);
            }
            
            return Result.fail<{ processedData: any }>('Unknown external service error occurred');
          }
        }
        
        async submitDataForProcessing(data: any): Promise<Result<{ submissionId: string; status: string }>> {
          try {
            // Input validation
            if (!data || typeof data !== 'object') {
              return Result.fail<{ submissionId: string; status: string }>('Invalid data for processing submission');
            }
            
            const response = await this.httpClient.post('/api/submit', data);
            
            // Handle various HTTP status codes
            if (response.statusCode === 400) {
              return Result.fail<{ submissionId: string; status: string }>('Bad request - data validation failed on external service');
            }
            if (response.statusCode === 401) {
              return Result.fail<{ submissionId: string; status: string }>('Authentication failed with external service');
            }
            if (response.statusCode === 429) {
              return Result.fail<{ submissionId: string; status: string }>('Rate limit exceeded - please try again later');
            }
            if (response.statusCode === 500) {
              return Result.fail<{ submissionId: string; status: string }>('External service internal error');
            }
            
            if (!response.success || !response.data) {
              return Result.fail<{ submissionId: string; status: string }>('Data submission failed on external service');
            }
            
            const { submissionId, status } = response.data;
            
            if (!submissionId) {
              return Result.fail<{ submissionId: string; status: string }>('External service did not return submission ID');
            }
            
            return Result.ok({ submissionId, status: status || 'submitted' });
            
          } catch (error) {
            return Result.fail<{ submissionId: string; status: string }>(
              `Data submission error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }
      
      // Mock HTTP client
      const mockHttpClient: HttpClient = {
        get: jest.fn(),
        post: jest.fn()
      };
      
      const service = new ExternalDataService(mockHttpClient);
      
      // Act & Assert - Successful external call
      (mockHttpClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: { processed: true, result: 'success' },
        statusCode: 200
      });
      
      const successResult = await service.fetchProcessedData('entity-123');
      expect(successResult.isSuccess).toBe(true);
      
      if (successResult.isSuccess) {
        expect(successResult.value.processedData.processed).toBe(true);
        expect(successResult.value.processedData.result).toBe('success');
      }
      
      // Act & Assert - External service error
      (mockHttpClient.get as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Entity not found',
        statusCode: 404
      });
      
      const externalErrorResult = await service.fetchProcessedData('entity-123');
      expect(externalErrorResult.isFailure).toBe(true);
      
      if (externalErrorResult.isFailure) {
        expect(externalErrorResult.error).toBe('External service error: Entity not found');
      }
      
      // Act & Assert - Network exception
      (mockHttpClient.get as jest.Mock).mockRejectedValue(new Error('Network timeout'));
      
      const networkErrorResult = await service.fetchProcessedData('entity-123');
      expect(networkErrorResult.isFailure).toBe(true);
      
      if (networkErrorResult.isFailure) {
        expect(networkErrorResult.error).toBe('External service timeout - please try again later');
      }
      
      // Act & Assert - Invalid input
      const invalidInputResult = await service.fetchProcessedData('');
      expect(invalidInputResult.isFailure).toBe(true);
      
      if (invalidInputResult.isFailure) {
        expect(invalidInputResult.error).toBe('Entity ID is required for data processing');
      }
    });
  });
});

/**
 * PHASE 4: Cross-Layer Result Integration Patterns
 * These tests define how Results flow across architectural boundaries
 */
describe('Cross-Layer Result Integration Specification', () => {
  
  test('FullStackOperation_ResultPropagation_MustPreserveErrorContextAcrossLayers', async () => {
    // This test defines end-to-end Result propagation across all layers
    
    // Domain Layer
    class DomainEntity {
      static create(name: string): Result<DomainEntity> {
        if (!name?.trim()) {
          return Result.fail<DomainEntity>('Domain: Entity name is required');
        }
        return Result.ok(new DomainEntity(name.trim()));
      }
      
      private constructor(private name: string) {}
      getName(): string { return this.name; }
    }
    
    // Infrastructure Layer
    class Repository {
      async save(entity: DomainEntity): Promise<Result<{ saved: boolean }>> {
        try {
          // Simulate database operation
          if (entity.getName() === 'FAIL') {
            return Result.fail<{ saved: boolean }>('Infrastructure: Database constraint violation');
          }
          return Result.ok({ saved: true });
        } catch (error) {
          return Result.fail<{ saved: boolean }>('Infrastructure: Database connection failed');
        }
      }
    }
    
    // Application Layer
    class UseCase {
      constructor(private repository: Repository) {}
      
      async execute(command: { name: string }): Promise<Result<{ entityName: string; created: Date }>> {
        // Compose domain and infrastructure operations
        return DomainEntity.create(command.name)
          .asyncFlatMap(async (entity) => {
            const saveResult = await this.repository.save(entity);
            return saveResult.map(saved => ({
              entityName: entity.getName(),
              created: new Date()
            }));
          });
      }
    }
    
    // Interface Layer (would typically be HTTP controller)
    class Controller {
      constructor(private useCase: UseCase) {}
      
      async handleRequest(request: { name: string }): Promise<{ success: boolean; data?: any; error?: string }> {
        const result = await this.useCase.execute(request);
        
        // CRITICAL: Interface layer MUST handle Results appropriately
        return result.fold(
          (success) => ({ success: true, data: success }),
          (error) => ({ success: false, error })
        );
      }
    }
    
    // Integration test
    const repository = new Repository();
    const useCase = new UseCase(repository);
    const controller = new Controller(useCase);
    
    // Act & Assert - Success propagation
    const successResponse = await controller.handleRequest({ name: 'Valid Entity' });
    expect(successResponse.success).toBe(true);
    expect(successResponse.data?.entityName).toBe('Valid Entity');
    expect(successResponse.error).toBeUndefined();
    
    // Act & Assert - Domain error propagation
    const domainErrorResponse = await controller.handleRequest({ name: '' });
    expect(domainErrorResponse.success).toBe(false);
    expect(domainErrorResponse.error).toBe('Domain: Entity name is required');
    expect(domainErrorResponse.data).toBeUndefined();
    
    // Act & Assert - Infrastructure error propagation
    const infrastructureErrorResponse = await controller.handleRequest({ name: 'FAIL' });
    expect(infrastructureErrorResponse.success).toBe(false);
    expect(infrastructureErrorResponse.error).toBe('Infrastructure: Database constraint violation');
    expect(infrastructureErrorResponse.data).toBeUndefined();
  });
});

// Extend Result class with async methods for this test (normally would be in Result implementation)
declare module '../../../../lib/domain/shared/result' {
  interface Result<T> {
    asyncFlatMap<U>(fn: (value: T) => Promise<Result<U>>): Promise<Result<U>>;
  }
}

Result.prototype.asyncFlatMap = async function<T, U>(this: Result<T>, fn: (value: T) => Promise<Result<U>>): Promise<Result<U>> {
  if (this.isFailure) {
    return Result.fail<U>(this.error);
  }
  
  try {
    return await fn(this.value);
  } catch (error) {
    return Result.fail<U>(error instanceof Error ? error.message : String(error));
  }
};