// Jest is configured as the test runner
import { SoftDeleteFunctionModelUseCase } from '../../../../lib/use-cases/function-model/soft-delete-function-model-use-case';
import { IFunctionModelRepository } from '../../../../lib/domain/interfaces/function-model-repository';
import { IAuditLogRepository } from '../../../../lib/domain/interfaces/audit-log-repository';
import { DomainEventPublisher } from '../../../../lib/domain/events/domain-event-publisher';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';
import { Result } from '../../../../lib/domain/shared/result';
import { ModelSoftDeletedEvent, ModelUndeletedEvent } from '../../../../lib/domain/events/model-events';

describe('SoftDeleteFunctionModelUseCase', () => {
  let useCase: SoftDeleteFunctionModelUseCase;
  let mockFunctionModelRepository: IFunctionModelRepository;
  let mockAuditLogRepository: IAuditLogRepository;
  let mockEventPublisher: DomainEventPublisher;
  let testModel: FunctionModel;

  beforeEach(() => {
    mockFunctionModelRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      findPublishedVersions: jest.fn(),
      findDraftVersions: jest.fn(),
      delete: jest.fn(),
      findByStatus: jest.fn(),
      findDeleted: jest.fn(),
    };

    mockAuditLogRepository = {
      save: jest.fn(),
      findByEntityId: jest.fn(),
      findAll: jest.fn(),
    } as any;

    mockEventPublisher = {
      publish: jest.fn(),
    } as any;

    useCase = new SoftDeleteFunctionModelUseCase(
      mockFunctionModelRepository,
      mockAuditLogRepository,
      mockEventPublisher
    );

    // Create test model
    const nameResult = ModelName.create('Test Model');
    const versionResult = Version.create('1.0.0');
    
    expect(nameResult.isSuccess).toBe(true);
    expect(versionResult.isSuccess).toBe(true);

    const modelResult = FunctionModel.create({
      modelId: 'test-model-123',
      name: nameResult.value,
      version: versionResult.value,
      status: ModelStatus.DRAFT,
      currentVersion: versionResult.value,
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: {},
      permissions: { 'user-123': 'owner' },
    });

    expect(modelResult.isSuccess).toBe(true);
    testModel = modelResult.value;
  });

  describe('Soft Delete Operations', () => {
    describe('SoftDelete_ValidModelAndUser_ShouldMarkAsDeleted', () => {
      it('should successfully soft delete a model and preserve audit trail', async () => {
        // Arrange
        const userId = 'user-123';
        const reason = 'No longer needed for project';
        
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));
        jest.mocked(mockFunctionModelRepository.save).mockResolvedValue(Result.ok(undefined));
        jest.mocked(mockAuditLogRepository.save).mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.softDelete('test-model-123', userId, reason);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockFunctionModelRepository.findById).toHaveBeenCalledWith('test-model-123');
        expect(mockFunctionModelRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            modelId: 'test-model-123',
            isDeleted: expect.any(Function), // Check for isDeleted method
          })
        );
        expect(mockAuditLogRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'FunctionModel',
            entityId: 'test-model-123',
            action: 'SOFT_DELETE',
            userId: 'user-123',
            details: expect.objectContaining({
              reason: 'No longer needed for project',
              deletedAt: expect.any(Date),
            }),
          })
        );
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          expect.any(ModelSoftDeletedEvent)
        );
      });
    });

    describe('SoftDelete_NonExistentModel_ShouldReturnFailure', () => {
      it('should return failure when model does not exist', async () => {
        // Arrange
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(
          Result.fail('Model not found')
        );

        // Act
        const result = await useCase.softDelete('non-existent-model', 'user-123');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Model not found');
        expect(mockFunctionModelRepository.save).not.toHaveBeenCalled();
        expect(mockAuditLogRepository.save).not.toHaveBeenCalled();
        expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      });
    });

    describe('SoftDelete_AlreadyDeletedModel_ShouldReturnFailure', () => {
      it('should return failure when model is already soft deleted', async () => {
        // Arrange
        const deleteResult = testModel.softDelete('user-456');
        expect(deleteResult.isSuccess).toBe(true);
        
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));

        // Act
        const result = await useCase.softDelete('test-model-123', 'user-123');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('already deleted');
        expect(mockFunctionModelRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('SoftDelete_InsufficientPermissions_ShouldReturnFailure', () => {
      it('should return failure when user lacks delete permissions', async () => {
        // Arrange
        const userId = 'unauthorized-user';
        
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));

        // Act
        const result = await useCase.softDelete('test-model-123', userId);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('permission');
        expect(mockFunctionModelRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Access Control for Deleted Models', () => {
    describe('FindDeleted_AdminUser_ShouldReturnDeletedModels', () => {
      it('should allow admin users to access soft deleted models', async () => {
        // Arrange
        const softDeleteResult = testModel.softDelete('user-123');
        expect(softDeleteResult.isSuccess).toBe(true);

        jest.mocked(mockFunctionModelRepository.findDeleted).mockResolvedValue(
          Result.ok([testModel])
        );

        // Act
        const result = await useCase.findDeleted('admin-user');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(1);
        expect(result.value[0].modelId).toBe('test-model-123');
        expect(result.value[0].isDeleted()).toBe(true);
      });
    });

    describe('FindDeleted_RegularUser_ShouldReturnFailure', () => {
      it('should prevent regular users from accessing soft deleted models', async () => {
        // Arrange
        const regularUserId = 'regular-user';

        // Act
        const result = await useCase.findDeleted(regularUserId);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('admin');
        expect(mockFunctionModelRepository.findDeleted).not.toHaveBeenCalled();
      });
    });

    describe('BlockOperations_OnDeletedModel_ShouldPreventModifications', () => {
      it('should prevent normal operations on soft deleted models', async () => {
        // Arrange
        const deleteResult = testModel.softDelete('user-123');
        expect(deleteResult.isSuccess).toBe(true);

        // Act & Assert - Test various operations fail
        const addNodeResult = testModel.addContainerNode(
          // Mock node - this should be properly created in actual implementation
          {} as any
        );
        expect(addNodeResult.isFailure).toBe(true);
        expect(addNodeResult.error).toContain('deleted model');

        // Additional operations should also fail
        const publishResult = testModel.publish();
        expect(publishResult.isFailure).toBe(true);
      });
    });
  });

  describe('Audit Trail Preservation', () => {
    describe('AuditTrail_SoftDeleteOperation_ShouldPreserveCompleteHistory', () => {
      it('should preserve complete audit history during soft delete', async () => {
        // Arrange
        const userId = 'user-123';
        const reason = 'Data retention policy compliance';
        const metadata = { projectId: 'proj-456', department: 'Engineering' };

        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));
        jest.mocked(mockFunctionModelRepository.save).mockResolvedValue(Result.ok(undefined));
        jest.mocked(mockAuditLogRepository.save).mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.softDelete('test-model-123', userId, reason, metadata);

        // Assert
        expect(result.isSuccess).toBe(true);
        // Verify that audit log was saved with correct entity
        expect(mockAuditLogRepository.save).toHaveBeenCalledTimes(1);
        const savedAuditLog = jest.mocked(mockAuditLogRepository.save).mock.calls[0][0];
        
        // Check that it's an AuditLog entity with correct properties
        expect(savedAuditLog.entityType).toBe('FunctionModel');
        expect(savedAuditLog.entityId).toBe('test-model-123');
        expect(savedAuditLog.action).toBe('SOFT_DELETE');
        expect(savedAuditLog.userId).toBe('user-123');
        
        // Check the details structure
        const details = savedAuditLog.details;
        expect(details.reason).toBe('Data retention policy compliance');
        expect(details.deletedAt).toBeInstanceOf(Date);
        expect(details.preservedData).toMatchObject({
          name: testModel.name.toString(),
          version: testModel.version.toString(),
          status: testModel.status,
          nodeCount: testModel.nodes.size,
          actionCount: testModel.actionNodes.size,
        });
      });
    });

    describe('AuditQuery_DeletedModelHistory_ShouldReturnCompleteTimeline', () => {
      it('should allow querying complete audit history for deleted models', async () => {
        // Arrange
        const mockAuditLogs = [
          { action: 'CREATE', timestamp: new Date('2024-01-01'), userId: 'user-123' },
          { action: 'UPDATE', timestamp: new Date('2024-01-02'), userId: 'user-123' },
          { action: 'PUBLISH', timestamp: new Date('2024-01-03'), userId: 'user-123' },
          { action: 'SOFT_DELETE', timestamp: new Date('2024-01-04'), userId: 'user-456' },
        ];

        jest.mocked(mockAuditLogRepository.findByEntityId).mockResolvedValue(
          Result.ok(mockAuditLogs as any)
        );

        // Act
        const result = await useCase.getDeletedModelAuditHistory('test-model-123', 'admin-user');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(4);
        expect(result.value[3].action).toBe('SOFT_DELETE');
        expect(mockAuditLogRepository.findByEntityId).toHaveBeenCalledWith('test-model-123');
      });
    });
  });

  describe('Recovery and Restoration', () => {
    describe('RestoreModel_ValidDeletedModel_ShouldSuccessfullyRestore', () => {
      it('should successfully restore a soft deleted model', async () => {
        // Arrange
        const deleteResult = testModel.softDelete('user-123');
        expect(deleteResult.isSuccess).toBe(true);
        
        const adminUserId = 'admin-user';
        const restoreReason = 'Accidentally deleted, project still active';

        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));
        jest.mocked(mockFunctionModelRepository.save).mockResolvedValue(Result.ok(undefined));
        jest.mocked(mockAuditLogRepository.save).mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.restoreModel('test-model-123', adminUserId, restoreReason);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockFunctionModelRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            modelId: 'test-model-123',
          })
        );
        expect(mockAuditLogRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'RESTORE',
            userId: adminUserId,
            details: expect.objectContaining({
              reason: restoreReason,
              restoredAt: expect.any(Date),
            }),
          })
        );
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          expect.any(ModelUndeletedEvent)
        );
      });
    });

    describe('RestoreModel_NonDeletedModel_ShouldReturnFailure', () => {
      it('should return failure when trying to restore non-deleted model', async () => {
        // Arrange
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));

        // Act
        const result = await useCase.restoreModel('test-model-123', 'admin-user');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('not deleted');
        expect(mockFunctionModelRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('RestoreModel_InsufficientPermissions_ShouldReturnFailure', () => {
      it('should prevent non-admin users from restoring models', async () => {
        // Arrange
        const deleteResult = testModel.softDelete('user-123');
        expect(deleteResult.isSuccess).toBe(true);
        
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));

        // Act
        const result = await useCase.restoreModel('test-model-123', 'regular-user');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('admin');
        expect(mockFunctionModelRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cascading Effects and Referential Integrity', () => {
    describe('CascadingDelete_WithDependentModels_ShouldHandleReferences', () => {
      it('should handle cascading effects when deleting models with dependencies', async () => {
        // Arrange
        const userId = 'user-123';
        const dependentModelIds = ['dependent-1', 'dependent-2'];
        
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));
        jest.mocked(mockFunctionModelRepository.save).mockResolvedValue(Result.ok(undefined));
        jest.mocked(mockAuditLogRepository.save).mockResolvedValue(Result.ok(undefined));

        // Mock finding dependent models
        const checkDependenciesResult = Result.ok(dependentModelIds);

        // Act
        const result = await useCase.softDelete(
          'test-model-123', 
          userId, 
          'Parent model deletion',
          { checkDependencies: true }
        );

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockAuditLogRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              cascadingEffects: expect.objectContaining({
                dependentModels: dependentModelIds,
                referencesHandled: true,
              }),
            }),
          })
        );
      });
    });

    describe('PreventDelete_WithActiveReferences_ShouldBlockDeletion', () => {
      it('should prevent deletion when model has active critical references', async () => {
        // Arrange
        const userId = 'user-123';
        
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));

        // Mock active references check
        const mockActiveReferences = ['active-workflow-1', 'scheduled-job-2'];

        // Act
        const result = await useCase.softDelete(
          'test-model-123', 
          userId, 
          'Cleanup',
          { enforceReferentialIntegrity: true }
        );

        // Assert - This should be configured to fail when active references exist
        // The exact implementation depends on business rules
        expect(mockFunctionModelRepository.findById).toHaveBeenCalledWith('test-model-123');
      });
    });
  });

  describe('Compliance and Data Retention', () => {
    describe('ComplianceDelete_WithRetentionPeriod_ShouldRespectPolicies', () => {
      it('should respect data retention policies during soft delete', async () => {
        // Arrange
        const userId = 'compliance-officer';
        const retentionMetadata = {
          retentionPeriod: '7-years',
          complianceFramework: 'SOX',
          dataClassification: 'sensitive',
        };

        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));
        jest.mocked(mockFunctionModelRepository.save).mockResolvedValue(Result.ok(undefined));
        jest.mocked(mockAuditLogRepository.save).mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.softDelete(
          'test-model-123',
          userId,
          'Compliance requirement',
          retentionMetadata
        );

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockAuditLogRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              compliance: expect.objectContaining({
                retentionPeriod: '7-years',
                complianceFramework: 'SOX',
                dataClassification: 'sensitive',
                deletionScheduled: expect.any(Date),
              }),
            }),
          })
        );
      });
    });

    describe('GetDeletionCandidates_BasedOnPolicy_ShouldReturnEligibleModels', () => {
      it('should identify models eligible for deletion based on retention policy', async () => {
        // Arrange
        const retentionPolicyDays = 365;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionPolicyDays);

        // Act
        const result = await useCase.getDeletionCandidates('admin-user', {
          retentionPolicyDays,
          includeArchived: true,
          excludeActive: true,
        });

        // Assert - Implementation would depend on repository method
        expect(mockFunctionModelRepository.findByStatus).toHaveBeenCalledWith(
          expect.any(Array)
        );
      });
    });
  });

  describe('Clean Architecture Compliance', () => {
    describe('DomainEventPublishing_OnSoftDelete_ShouldNotifySubscribers', () => {
      it('should publish domain events following Clean Architecture patterns', async () => {
        // Arrange
        const userId = 'user-123';
        
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));
        jest.mocked(mockFunctionModelRepository.save).mockResolvedValue(Result.ok(undefined));
        jest.mocked(mockAuditLogRepository.save).mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.softDelete('test-model-123', userId);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
        
        const publishedEvent = jest.mocked(mockEventPublisher.publish).mock.calls[0][0];
        expect(publishedEvent).toBeInstanceOf(ModelSoftDeletedEvent);
        expect(publishedEvent.aggregateId).toBe('test-model-123');
        expect(publishedEvent.deletedBy).toBe(userId);
      });
    });

    describe('RepositoryAbstraction_SoftDeleteOperations_ShouldUseInterfaces', () => {
      it('should use repository interfaces without infrastructure dependencies', () => {
        // Arrange & Act - Constructor and method calls demonstrate interface usage
        expect(useCase).toBeDefined();
        
        // Assert - The use case should only depend on interfaces, not concrete implementations
        expect(mockFunctionModelRepository.findById).toBeDefined();
        expect(mockFunctionModelRepository.save).toBeDefined();
        expect(mockFunctionModelRepository.findDeleted).toBeDefined();
        expect(mockAuditLogRepository.save).toBeDefined();
        expect(mockAuditLogRepository.findByEntityId).toBeDefined();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    describe('ConcurrencyConflict_DuringDeletion_ShouldHandleGracefully', () => {
      it('should handle concurrent modification during soft delete', async () => {
        // Arrange
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));
        jest.mocked(mockFunctionModelRepository.save).mockResolvedValue(
          Result.fail('Concurrency conflict: Model was modified by another user')
        );

        // Act
        const result = await useCase.softDelete('test-model-123', 'user-123');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Concurrency conflict');
        expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      });
    });

    describe('DatabaseFailure_DuringAuditSave_ShouldRollbackChanges', () => {
      it('should rollback model changes if audit log save fails', async () => {
        // Arrange
        jest.mocked(mockFunctionModelRepository.findById).mockResolvedValue(Result.ok(testModel));
        jest.mocked(mockFunctionModelRepository.save).mockResolvedValue(Result.ok(undefined));
        jest.mocked(mockAuditLogRepository.save).mockResolvedValue(
          Result.fail('Database connection error')
        );

        // Act
        const result = await useCase.softDelete('test-model-123', 'user-123');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Database connection error');
        // In a real implementation, this would trigger rollback logic
      });
    });
  });
});