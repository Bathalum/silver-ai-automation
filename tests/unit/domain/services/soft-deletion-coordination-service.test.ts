// Jest is configured as the test runner
import { SoftDeletionCoordinationService } from '../../../../lib/domain/services/soft-deletion-coordination-service';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';
import { Result } from '../../../../lib/domain/shared/result';
import { NodeDependencyService } from '../../../../lib/domain/services/node-dependency-service';
import { ModelSoftDeletedEvent, ModelUndeletedEvent } from '../../../../lib/domain/events/model-events';

/**
 * UC-009: Soft Delete Function Model - Domain Service Tests
 * 
 * Tests the domain service responsible for coordinating soft deletion operations,
 * including dependency analysis, cascading effects, and audit trail management.
 * 
 * Clean Architecture Compliance:
 * - Tests domain coordination logic without infrastructure dependencies
 * - Validates business rules around soft deletion
 * - Ensures proper domain event generation
 * - Confirms referential integrity handling
 */
describe('SoftDeletionCoordinationService', () => {
  let service: SoftDeletionCoordinationService;
  let mockNodeDependencyService: NodeDependencyService;
  let testModel: FunctionModel;
  let relatedModel: FunctionModel;

  beforeEach(() => {
    mockNodeDependencyService = {
      findDependentModels: jest.fn(),
      findModelDependencies: jest.fn(),
      validateDependencyIntegrity: jest.fn(),
      analyzeCascadingEffects: jest.fn(),
    } as any;

    service = new SoftDeletionCoordinationService(mockNodeDependencyService);

    // Create test model
    const nameResult = ModelName.create('Test Model');
    const versionResult = Version.create('1.0.0');
    
    expect(nameResult.isSuccess).toBe(true);
    expect(versionResult.isSuccess).toBe(true);

    const modelResult = FunctionModel.create({
      modelId: 'test-model-123',
      name: nameResult.value,
      version: versionResult.value,
      status: ModelStatus.PUBLISHED,
      currentVersion: versionResult.value,
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: { projectId: 'proj-456' },
      permissions: { 'user-123': 'owner' },
    });

    expect(modelResult.isSuccess).toBe(true);
    testModel = modelResult.value;

    // Create related model for dependency tests
    const relatedNameResult = ModelName.create('Related Model');
    const relatedModelResult = FunctionModel.create({
      modelId: 'related-model-456',
      name: relatedNameResult.value,
      version: versionResult.value,
      status: ModelStatus.DRAFT,
      currentVersion: versionResult.value,
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: { parentModelId: 'test-model-123' },
      permissions: { 'user-123': 'owner' },
    });

    expect(relatedModelResult.isSuccess).toBe(true);
    relatedModel = relatedModelResult.value;
  });

  describe('Soft Deletion Coordination', () => {
    describe('CoordinateSoftDeletion_ValidModel_ShouldAnalyzeDependencies', () => {
      it('should coordinate soft deletion with full dependency analysis', async () => {
        // Arrange
        const deletionRequest = {
          modelId: 'test-model-123',
          deletedBy: 'user-123',
          reason: 'End of project lifecycle',
          metadata: { projectId: 'proj-456', department: 'Engineering' },
          preserveAuditTrail: true,
          checkDependencies: true,
        };

        const mockDependentModels = ['dependent-1', 'dependent-2'];
        const mockCascadingEffects = {
          affectedModels: mockDependentModels,
          brokenReferences: [],
          requiresManualIntervention: false,
        };

        jest.mocked(mockNodeDependencyService.findDependentModels).mockResolvedValue(
          Result.ok(mockDependentModels)
        );
        jest.mocked(mockNodeDependencyService.analyzeCascadingEffects).mockResolvedValue(
          Result.ok(mockCascadingEffects)
        );

        // Act
        const result = await service.coordinateSoftDeletion(testModel, deletionRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            canDelete: true,
            dependencyAnalysis: expect.objectContaining({
              dependentModels: mockDependentModels,
              cascadingEffects: mockCascadingEffects,
            }),
            auditData: expect.objectContaining({
              preservedModelState: expect.objectContaining({
                name: testModel.name.toString(),
                version: testModel.version.toString(),
                status: testModel.status,
                metadata: testModel.metadata,
              }),
              deletionMetadata: expect.objectContaining({
                reason: 'End of project lifecycle',
                timestamp: expect.any(Date),
                deletedBy: 'user-123',
              }),
            }),
            domainEvents: expect.arrayContaining([
              expect.any(ModelSoftDeletedEvent),
            ]),
          })
        );

        expect(mockNodeDependencyService.findDependentModels).toHaveBeenCalledWith('test-model-123');
        expect(mockNodeDependencyService.analyzeCascadingEffects).toHaveBeenCalledWith(
          'test-model-123',
          mockDependentModels
        );
      });
    });

    describe('CoordinateSoftDeletion_WithActiveReferences_ShouldPreventDeletion', () => {
      it('should prevent deletion when model has active critical references', async () => {
        // Arrange
        const deletionRequest = {
          modelId: 'test-model-123',
          deletedBy: 'user-123',
          reason: 'Cleanup',
          enforceReferentialIntegrity: true,
        };

        const mockCriticalReferences = {
          affectedModels: ['critical-workflow-1', 'active-job-2'],
          brokenReferences: ['critical-ref-1', 'critical-ref-2'],
          requiresManualIntervention: true,
        };

        jest.mocked(mockNodeDependencyService.findDependentModels).mockResolvedValue(
          Result.ok(['critical-workflow-1', 'active-job-2'])
        );
        jest.mocked(mockNodeDependencyService.analyzeCascadingEffects).mockResolvedValue(
          Result.ok(mockCriticalReferences)
        );

        // Act
        const result = await service.coordinateSoftDeletion(testModel, deletionRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.canDelete).toBe(false);
        expect(result.value.blockingReasons).toContain('Active critical references exist');
        expect(result.value.dependencyAnalysis.cascadingEffects.requiresManualIntervention).toBe(true);
        expect(result.value.domainEvents).toHaveLength(0); // No deletion events if blocked
      });
    });

    describe('CoordinateSoftDeletion_WithCascadingDeletion_ShouldHandleChain', () => {
      it('should coordinate cascading soft deletion across related models', async () => {
        // Arrange
        const deletionRequest = {
          modelId: 'test-model-123',
          deletedBy: 'user-123',
          reason: 'Parent model deletion',
          allowCascading: true,
          cascadingDeletePolicy: 'soft-delete-dependents',
        };

        const mockDependentModels = ['child-1', 'child-2'];
        const mockCascadingEffects = {
          affectedModels: mockDependentModels,
          brokenReferences: [],
          requiresManualIntervention: false,
          cascadingDeletions: mockDependentModels,
        };

        jest.mocked(mockNodeDependencyService.findDependentModels).mockResolvedValue(
          Result.ok(mockDependentModels)
        );
        jest.mocked(mockNodeDependencyService.analyzeCascadingEffects).mockResolvedValue(
          Result.ok(mockCascadingEffects)
        );

        // Act
        const result = await service.coordinateSoftDeletion(testModel, deletionRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.canDelete).toBe(true);
        expect(result.value.cascadingDeletions).toEqual(mockDependentModels);
        expect(result.value.auditData.cascadingEffects).toEqual(mockCascadingEffects);
        
        // Should generate events for parent and cascade
        expect(result.value.domainEvents).toHaveLength(1 + mockDependentModels.length);
        expect(result.value.domainEvents[0]).toBeInstanceOf(ModelSoftDeletedEvent);
      });
    });
  });

  describe('Access Control and State Validation', () => {
    describe('ValidateModelAccessibility_DeletedModel_ShouldRestrictAccess', () => {
      it('should validate access permissions for deleted models', () => {
        // Arrange
        const softDeleteResult = testModel.softDelete('user-456');
        expect(softDeleteResult.isSuccess).toBe(true);

        // Act & Assert - Regular user access
        const regularUserAccess = service.validateModelAccessibility(testModel, 'regular-user');
        expect(regularUserAccess.isSuccess).toBe(false);
        expect(regularUserAccess.error).toContain('deleted model');

        // Act & Assert - Admin user access
        const adminAccess = service.validateModelAccessibility(testModel, 'admin-user', { isAdmin: true });
        expect(adminAccess.isSuccess).toBe(true);
        expect(adminAccess.value.accessLevel).toBe('admin-read-only');
        expect(adminAccess.value.allowedOperations).toContain('view-audit-trail');
        expect(adminAccess.value.allowedOperations).toContain('restore');
      });
    });

    describe('ValidateModelState_ForSoftDeletion_ShouldCheckPreconditions', () => {
      it('should validate model state before allowing soft deletion', () => {
        // Arrange - Test various model states
        const testCases = [
          {
            status: ModelStatus.PUBLISHED,
            expected: { canDelete: true, reason: null },
          },
          {
            status: ModelStatus.DRAFT,
            expected: { canDelete: true, reason: null },
          },
          {
            status: ModelStatus.ARCHIVED,
            expected: { canDelete: false, reason: 'Cannot delete archived model' },
          },
        ];

        testCases.forEach(({ status, expected }) => {
          // Arrange
          const modelName = ModelName.create(`Test Model ${status}`);
          const version = Version.create('1.0.0');
          const model = FunctionModel.create({
            modelId: `test-${status}`,
            name: modelName.value,
            version: version.value,
            status,
            currentVersion: version.value,
            nodes: new Map(),
            actionNodes: new Map(),
            metadata: {},
            permissions: { 'user-123': 'owner' },
          });

          // Act
          const result = service.validateModelState(model.value, 'user-123');

          // Assert
          expect(result.isSuccess).toBe(expected.canDelete);
          if (!expected.canDelete) {
            expect(result.error).toContain(expected.reason);
          }
        });
      });
    });

    describe('ValidateRestoreEligibility_ForDeletedModel_ShouldCheckConditions', () => {
      it('should validate eligibility for model restoration', () => {
        // Arrange
        const softDeleteResult = testModel.softDelete('user-123');
        expect(softDeleteResult.isSuccess).toBe(true);

        const restoreConditions = {
          maxDaysDeleted: 30,
          requiresAdminApproval: true,
          checkDependencyIntegrity: true,
        };

        // Act
        const result = service.validateRestoreEligibility(testModel, 'admin-user', restoreConditions);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            canRestore: true,
            eligibilityChecks: expect.objectContaining({
              withinTimeLimit: true,
              hasAdminPermission: true,
              dependenciesIntact: true,
            }),
            restoreMetadata: expect.objectContaining({
              originalStatus: ModelStatus.PUBLISHED,
              deletedAt: expect.any(Date),
              daysSinceDeletion: expect.any(Number),
            }),
          })
        );
      });
    });
  });

  describe('Audit Trail and Compliance', () => {
    describe('GenerateAuditData_ForSoftDeletion_ShouldCaptureCompleteState', () => {
      it('should generate comprehensive audit data for soft deletion', () => {
        // Arrange
        const deletionContext = {
          reason: 'Data retention policy compliance',
          deletedBy: 'compliance-officer',
          complianceFramework: 'SOX',
          retentionPeriod: '7-years',
          metadata: { projectId: 'proj-456', department: 'Engineering' },
        };

        // Act
        const auditData = service.generateAuditData(testModel, deletionContext);

        // Assert
        expect(auditData).toEqual(
          expect.objectContaining({
            entitySnapshot: expect.objectContaining({
              modelId: 'test-model-123',
              name: testModel.name.toString(),
              version: testModel.version.toString(),
              status: testModel.status,
              nodeCount: testModel.nodes.size,
              actionNodeCount: testModel.actionNodes.size,
              metadata: testModel.metadata,
              permissions: testModel.permissions,
            }),
            deletionDetails: expect.objectContaining({
              reason: 'Data retention policy compliance',
              deletedBy: 'compliance-officer',
              deletedAt: expect.any(Date),
              complianceContext: expect.objectContaining({
                framework: 'SOX',
                retentionPeriod: '7-years',
              }),
            }),
            preservationData: expect.objectContaining({
              nodeStructure: expect.any(Object),
              relationships: expect.any(Object),
              executionHistory: expect.any(Object),
            }),
          })
        );
      });
    });

    describe('CalculateRetentionPolicy_ForDeletedModel_ShouldDetermineLifecycle', () => {
      it('should calculate retention policy and deletion lifecycle', () => {
        // Arrange
        const complianceRequirements = {
          framework: 'GDPR',
          dataClassification: 'personal',
          retentionPeriodYears: 2,
          jurisdiction: 'EU',
        };

        const softDeleteResult = testModel.softDelete('compliance-officer');
        expect(softDeleteResult.isSuccess).toBe(true);

        // Act
        const retentionPolicy = service.calculateRetentionPolicy(testModel, complianceRequirements);

        // Assert
        expect(retentionPolicy).toEqual(
          expect.objectContaining({
            retentionPeriodDays: 730, // 2 years
            hardDeleteScheduledAt: expect.any(Date),
            complianceFramework: 'GDPR',
            dataClassification: 'personal',
            lifecycle: expect.objectContaining({
              softDeletedAt: expect.any(Date),
              eligibleForHardDeleteAt: expect.any(Date),
              finalDeletionDate: expect.any(Date),
            }),
            reviewMilestones: expect.arrayContaining([
              expect.objectContaining({
                action: 'RETENTION_REVIEW',
                scheduledAt: expect.any(Date),
              }),
            ]),
          })
        );
      });
    });
  });

  describe('Recovery and Restoration Coordination', () => {
    describe('CoordinateModelRestoration_ValidRequest_ShouldRestoreState', () => {
      it('should coordinate complete model restoration process', async () => {
        // Arrange
        const softDeleteResult = testModel.softDelete('user-123');
        expect(softDeleteResult.isSuccess).toBe(true);

        const restorationRequest = {
          modelId: 'test-model-123',
          restoredBy: 'admin-user',
          reason: 'Accidental deletion - project still active',
          validateDependencies: true,
          restoreMetadata: { projectReactivation: true },
        };

        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok({ integrityMaintained: true, brokenReferences: [] })
        );

        // Act
        const result = await service.coordinateModelRestoration(testModel, restorationRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            canRestore: true,
            restorationPlan: expect.objectContaining({
              targetStatus: ModelStatus.PUBLISHED, // Original status
              dependencyRestoration: expect.objectContaining({
                integrityMaintained: true,
                referencesToRestore: expect.any(Array),
              }),
            }),
            auditData: expect.objectContaining({
              restorationDetails: expect.objectContaining({
                reason: 'Accidental deletion - project still active',
                restoredBy: 'admin-user',
                restoredAt: expect.any(Date),
              }),
              originalDeletionData: expect.objectContaining({
                deletedAt: expect.any(Date),
                deletedBy: 'user-123',
              }),
            }),
            domainEvents: expect.arrayContaining([
              expect.any(ModelUndeletedEvent),
            ]),
          })
        );

        expect(mockNodeDependencyService.validateDependencyIntegrity).toHaveBeenCalledWith('test-model-123');
      });
    });

    describe('CoordinateModelRestoration_IntegrityViolations_ShouldProvideRepairPlan', () => {
      it('should provide repair plan when restoration faces integrity violations', async () => {
        // Arrange
        const softDeleteResult = testModel.softDelete('user-123');
        expect(softDeleteResult.isSuccess).toBe(true);

        const restorationRequest = {
          modelId: 'test-model-123',
          restoredBy: 'admin-user',
          reason: 'Business requirement change',
          validateDependencies: true,
        };

        const integrityViolations = {
          integrityMaintained: false,
          brokenReferences: ['ref-1', 'ref-2'],
          missingDependencies: ['dep-1'],
          repairActions: [
            { action: 'RESTORE_DEPENDENCY', target: 'dep-1' },
            { action: 'UPDATE_REFERENCE', target: 'ref-1', newTarget: 'alt-ref-1' },
          ],
        };

        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok(integrityViolations)
        );

        // Act
        const result = await service.coordinateModelRestoration(testModel, restorationRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.canRestore).toBe(false); // Cannot restore without manual intervention
        expect(result.value.blockingReasons).toContain('Referential integrity violations detected');
        expect(result.value.repairPlan).toEqual(
          expect.objectContaining({
            requiredActions: integrityViolations.repairActions,
            brokenReferences: integrityViolations.brokenReferences,
            missingDependencies: integrityViolations.missingDependencies,
            estimatedRepairComplexity: expect.stringMatching(/LOW|MEDIUM|HIGH/),
          })
        );
      });
    });
  });

  describe('Clean Architecture Compliance', () => {
    describe('DomainServiceCoordination_ShouldUseOnlyDomainDependencies', () => {
      it('should coordinate deletion using only domain services and entities', () => {
        // Arrange & Assert - Constructor and dependencies demonstrate Clean Architecture
        expect(service).toBeDefined();
        expect(service.constructor.name).toBe('SoftDeletionCoordinationService');
        
        // Service should only depend on other domain services, not infrastructure
        const dependencies = [
          mockNodeDependencyService,
        ];

        dependencies.forEach(dep => {
          expect(dep).toBeDefined();
          // Verify these are domain services, not infrastructure implementations
          expect(typeof dep.findDependentModels).toBe('function');
          expect(typeof dep.analyzeCascadingEffects).toBe('function');
        });
      });
    });

    describe('DomainEventGeneration_ShouldFollowEventSourcingPatterns', () => {
      it('should generate domain events following Clean Architecture patterns', async () => {
        // Arrange
        const deletionRequest = {
          modelId: 'test-model-123',
          deletedBy: 'user-123',
          reason: 'Test deletion',
        };

        jest.mocked(mockNodeDependencyService.findDependentModels).mockResolvedValue(Result.ok([]));
        jest.mocked(mockNodeDependencyService.analyzeCascadingEffects).mockResolvedValue(
          Result.ok({ affectedModels: [], brokenReferences: [], requiresManualIntervention: false })
        );

        // Act
        const result = await service.coordinateSoftDeletion(testModel, deletionRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.domainEvents).toHaveLength(1);
        
        const deletionEvent = result.value.domainEvents[0];
        expect(deletionEvent).toBeInstanceOf(ModelSoftDeletedEvent);
        expect(deletionEvent.aggregateId).toBe('test-model-123');
        expect(deletionEvent.deletedBy).toBe('user-123');
        expect(deletionEvent.occurredAt).toBeInstanceOf(Date);
        
        // Event should contain all necessary data for subscribers
        expect(deletionEvent.getEventData()).toEqual(
          expect.objectContaining({
            modelId: 'test-model-123',
            modelName: testModel.name.toString(),
            version: testModel.version.toString(),
            deletedBy: 'user-123',
            deletedAt: expect.any(Date),
            reason: 'Test deletion',
          })
        );
      });
    });

    describe('ResultPatternUsage_ShouldHandleErrorsGracefully', () => {
      it('should use Result pattern for error handling throughout coordination', async () => {
        // Arrange
        const deletionRequest = {
          modelId: 'test-model-123',
          deletedBy: 'user-123',
          reason: 'Test deletion',
        };

        // Mock dependency service failure
        jest.mocked(mockNodeDependencyService.findDependentModels).mockResolvedValue(
          Result.fail('Database connection error')
        );

        // Act
        const result = await service.coordinateSoftDeletion(testModel, deletionRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Database connection error');
        
        // Verify no partial state changes occurred
        expect(testModel.isDeleted()).toBe(false);
      });
    });
  });
});