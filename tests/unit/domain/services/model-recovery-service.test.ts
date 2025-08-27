// Jest is configured as the test runner
import { ModelRecoveryService } from '../../../../lib/domain/services/model-recovery-service';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';
import { Result } from '../../../../lib/domain/shared/result';
import { NodeDependencyService } from '../../../../lib/domain/services/node-dependency-service';
import { ModelVersioningService } from '../../../../lib/domain/services/model-versioning-service';
import { ModelUndeletedEvent, ModelRestoredEvent } from '../../../../lib/domain/events/model-events';

/**
 * UC-009: Soft Delete Function Model - Recovery Capability Tests
 * 
 * Tests the domain service responsible for coordinating model recovery operations,
 * including restoration validation, dependency integrity checks, and recovery workflows.
 * 
 * Clean Architecture Compliance:
 * - Tests domain coordination logic without infrastructure dependencies
 * - Validates business rules around model recovery and restoration
 * - Ensures proper domain event generation for recovery operations
 * - Confirms referential integrity restoration and validation
 */
describe('ModelRecoveryService', () => {
  let service: ModelRecoveryService;
  let mockNodeDependencyService: NodeDependencyService;
  let mockVersioningService: ModelVersioningService;
  let testModel: FunctionModel;
  let relatedModel: FunctionModel;

  beforeEach(() => {
    mockNodeDependencyService = {
      findDependentModels: jest.fn(),
      findModelDependencies: jest.fn(),
      validateDependencyIntegrity: jest.fn(),
      analyzeCascadingEffects: jest.fn(),
      repairBrokenReferences: jest.fn(),
    } as any;

    mockVersioningService = {
      validateVersionCompatibility: jest.fn(),
      checkVersionConflicts: jest.fn(),
      resolveVersionDependencies: jest.fn(),
      createRestorationVersion: jest.fn(),
    } as any;

    service = new ModelRecoveryService(mockNodeDependencyService, mockVersioningService);

    // Create test model in deleted state
    const nameResult = ModelName.create('Recoverable Model');
    const versionResult = Version.create('2.3.1');
    
    expect(nameResult.isSuccess).toBe(true);
    expect(versionResult.isSuccess).toBe(true);

    const modelResult = FunctionModel.create({
      modelId: 'recoverable-model-123',
      name: nameResult.value,
      version: versionResult.value,
      status: ModelStatus.PUBLISHED,
      currentVersion: versionResult.value,
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: { 
        projectId: 'recovery-project-456',
        department: 'Engineering',
        businessCriticality: 'high',
        originalCreationDate: '2024-01-15',
      },
      permissions: { 'user-123': 'owner', 'admin-456': 'admin' },
    });

    expect(modelResult.isSuccess).toBe(true);
    testModel = modelResult.value;

    // Soft delete the model for testing recovery
    const deleteResult = testModel.softDelete('temp-deleter');
    expect(deleteResult.isSuccess).toBe(true);

    // Create related model for dependency testing
    const relatedNameResult = ModelName.create('Dependent Model');
    const relatedModelResult = FunctionModel.create({
      modelId: 'dependent-model-789',
      name: relatedNameResult.value,
      version: versionResult.value,
      status: ModelStatus.DRAFT,
      currentVersion: versionResult.value,
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: { parentModelId: 'recoverable-model-123' },
      permissions: { 'user-123': 'owner' },
    });

    expect(relatedModelResult.isSuccess).toBe(true);
    relatedModel = relatedModelResult.value;
  });

  describe('Recovery Eligibility Assessment', () => {
    describe('AssessRecoveryEligibility_ValidDeletedModel_ShouldAllowRecovery', () => {
      it('should assess recovery eligibility for recently deleted model', async () => {
        // Arrange
        const recoveryRequest = {
          modelId: 'recoverable-model-123',
          requestedBy: 'admin-456',
          recoveryReason: 'Accidental deletion - project still active',
          validateDependencies: true,
          checkVersionCompatibility: true,
        };

        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok({ integrityMaintained: true, brokenReferences: [], missingDependencies: [] })
        );
        jest.mocked(mockVersioningService.validateVersionCompatibility).mockResolvedValue(
          Result.ok({ compatible: true, conflicts: [], warnings: [] })
        );

        // Act
        const result = await service.assessRecoveryEligibility(testModel, recoveryRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            canRecover: true,
            eligibilityStatus: 'ELIGIBLE',
            recoveryComplexity: 'LOW',
            eligibilityChecks: expect.objectContaining({
              timeElapsed: expect.objectContaining({
                passed: true,
                daysSinceDeletion: expect.any(Number),
                maxAllowedDays: 90, // Default recovery window
              }),
              permissionCheck: expect.objectContaining({
                passed: true,
                userRole: 'admin',
                requiredPermission: 'model-recovery',
              }),
              dependencyIntegrity: expect.objectContaining({
                passed: true,
                integrityMaintained: true,
                brokenReferences: [],
              }),
              versionCompatibility: expect.objectContaining({
                passed: true,
                compatible: true,
                conflicts: [],
              }),
            }),
            recoveryRecommendations: expect.arrayContaining([
              'Standard recovery process applicable',
              'No manual intervention required',
            ]),
          })
        );

        expect(mockNodeDependencyService.validateDependencyIntegrity).toHaveBeenCalledWith('recoverable-model-123');
        expect(mockVersioningService.validateVersionCompatibility).toHaveBeenCalledWith(testModel);
      });
    });

    describe('AssessRecoveryEligibility_ExpiredDeletionWindow_ShouldRestrictRecovery', () => {
      it('should restrict recovery when deletion window has expired', async () => {
        // Arrange - Simulate old deletion by modifying timestamp
        const oldDeletionDate = new Date();
        oldDeletionDate.setDate(oldDeletionDate.getDate() - 100); // 100 days ago
        
        // Create model with old deletion timestamp
        const oldDeletedModel = { ...testModel };
        Object.defineProperty(oldDeletedModel, 'deletedAt', {
          value: oldDeletionDate,
          writable: false,
        });

        const recoveryRequest = {
          modelId: 'recoverable-model-123',
          requestedBy: 'admin-456',
          recoveryReason: 'Late recovery attempt',
          maxRecoveryDays: 90,
        };

        // Act
        const result = await service.assessRecoveryEligibility(oldDeletedModel, recoveryRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.canRecover).toBe(false);
        expect(result.value.eligibilityStatus).toBe('EXPIRED');
        expect(result.value.blockingReasons).toContain('Recovery window expired');
        expect(result.value.eligibilityChecks.timeElapsed.passed).toBe(false);
        expect(result.value.eligibilityChecks.timeElapsed.daysSinceDeletion).toBeGreaterThan(90);
        
        // Should provide escalation options
        expect(result.value.escalationOptions).toEqual(
          expect.objectContaining({
            adminOverride: true,
            businessJustificationRequired: true,
            approvalWorkflow: 'senior-management',
          })
        );
      });
    });

    describe('AssessRecoveryEligibility_WithIntegrityViolations_ShouldRequireRepair', () => {
      it('should identify integrity violations and provide repair plan', async () => {
        // Arrange
        const integrityViolations = {
          integrityMaintained: false,
          brokenReferences: ['ref-node-1', 'ref-node-2'],
          missingDependencies: ['dependency-model-456'],
          orphanedConnections: ['connection-A-B'],
        };

        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok(integrityViolations)
        );
        jest.mocked(mockVersioningService.validateVersionCompatibility).mockResolvedValue(
          Result.ok({ compatible: true, conflicts: [], warnings: [] })
        );

        const recoveryRequest = {
          modelId: 'recoverable-model-123',
          requestedBy: 'admin-456',
          recoveryReason: 'Business continuity requirement',
          validateDependencies: true,
        };

        // Act
        const result = await service.assessRecoveryEligibility(testModel, recoveryRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.canRecover).toBe(false);
        expect(result.value.eligibilityStatus).toBe('REQUIRES_REPAIR');
        expect(result.value.recoveryComplexity).toBe('HIGH');
        expect(result.value.eligibilityChecks.dependencyIntegrity.passed).toBe(false);
        
        expect(result.value.repairPlan).toEqual(
          expect.objectContaining({
            repairActions: expect.arrayContaining([
              expect.objectContaining({
                action: 'RESTORE_MISSING_DEPENDENCY',
                target: 'dependency-model-456',
                complexity: 'MEDIUM',
              }),
              expect.objectContaining({
                action: 'REPAIR_BROKEN_REFERENCE',
                target: 'ref-node-1',
                complexity: 'LOW',
              }),
            ]),
            estimatedRepairTime: expect.stringMatching(/\d+\s*(hours?|days?)/),
            manualInterventionRequired: true,
          })
        );
      });
    });

    describe('AssessRecoveryEligibility_InsufficientPermissions_ShouldDenyAccess', () => {
      it('should deny recovery for users without sufficient permissions', async () => {
        // Arrange
        const recoveryRequest = {
          modelId: 'recoverable-model-123',
          requestedBy: 'regular-user-789', // Not an admin or owner
          recoveryReason: 'Need access to model',
        };

        // Act
        const result = await service.assessRecoveryEligibility(testModel, recoveryRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.canRecover).toBe(false);
        expect(result.value.eligibilityStatus).toBe('PERMISSION_DENIED');
        expect(result.value.blockingReasons).toContain('Insufficient permissions');
        expect(result.value.eligibilityChecks.permissionCheck.passed).toBe(false);
        expect(result.value.eligibilityChecks.permissionCheck.userRole).toBe('regular-user');
        expect(result.value.eligibilityChecks.permissionCheck.requiredPermission).toBe('model-recovery');
      });
    });
  });

  describe('Model Recovery Coordination', () => {
    describe('CoordinateModelRecovery_ValidEligibleModel_ShouldExecuteRecovery', () => {
      it('should coordinate complete model recovery process', async () => {
        // Arrange
        const recoveryPlan = {
          modelId: 'recoverable-model-123',
          recoveredBy: 'admin-456',
          recoveryReason: 'Project reactivation - business requirement',
          targetStatus: ModelStatus.PUBLISHED,
          preserveOriginalMetadata: true,
          notifyStakeholders: true,
        };

        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok({ integrityMaintained: true, brokenReferences: [], missingDependencies: [] })
        );
        jest.mocked(mockVersioningService.createRestorationVersion).mockResolvedValue(
          Result.ok({ versionCreated: true, newVersion: '2.3.2' })
        );

        // Act
        const result = await service.coordinateModelRecovery(testModel, recoveryPlan);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            recoveryExecuted: true,
            recoveryDetails: expect.objectContaining({
              recoveryTimestamp: expect.any(Date),
              recoveredBy: 'admin-456',
              originalDeletionData: expect.objectContaining({
                deletedAt: expect.any(Date),
                deletedBy: 'temp-deleter',
              }),
              restoredState: expect.objectContaining({
                modelId: 'recoverable-model-123',
                name: 'Recoverable Model',
                status: ModelStatus.PUBLISHED,
                isDeleted: false,
              }),
            }),
            versioningActions: expect.objectContaining({
              newVersionCreated: true,
              version: '2.3.2',
              versionReason: 'Model recovery restoration',
            }),
            dependencyActions: expect.objectContaining({
              integrityValidated: true,
              referencesRestored: true,
              dependenciesReconciled: true,
            }),
            auditData: expect.objectContaining({
              recoveryMetadata: expect.objectContaining({
                reason: 'Project reactivation - business requirement',
                recoveredBy: 'admin-456',
                recoveryComplexity: 'LOW',
                stakeholdersNotified: true,
              }),
            }),
            domainEvents: expect.arrayContaining([
              expect.any(ModelUndeletedEvent),
              expect.any(ModelRestoredEvent),
            ]),
          })
        );

        expect(mockVersioningService.createRestorationVersion).toHaveBeenCalledWith(
          testModel, 
          expect.objectContaining({ reason: 'Model recovery restoration' })
        );
      });
    });

    describe('CoordinateModelRecovery_WithDependencyRepair_ShouldRepairAndRestore', () => {
      it('should coordinate recovery with dependency repair actions', async () => {
        // Arrange
        const recoveryPlan = {
          modelId: 'recoverable-model-123',
          recoveredBy: 'admin-456',
          recoveryReason: 'Dependency chain restoration',
          repairDependencies: true,
          allowDependencyRecreation: true,
        };

        const repairActions = [
          {
            action: 'RESTORE_MISSING_DEPENDENCY',
            target: 'missing-dependency-123',
            status: 'completed',
          },
          {
            action: 'REPAIR_BROKEN_REFERENCE',
            target: 'broken-ref-456',
            status: 'completed',
          },
        ];

        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValueOnce(
          Result.ok({ 
            integrityMaintained: false, 
            brokenReferences: ['broken-ref-456'], 
            missingDependencies: ['missing-dependency-123'],
          })
        );
        
        jest.mocked(mockNodeDependencyService.repairBrokenReferences).mockResolvedValue(
          Result.ok({ repairActions, allRepairsSuccessful: true })
        );
        
        // After repair, integrity should be maintained
        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValueOnce(
          Result.ok({ integrityMaintained: true, brokenReferences: [], missingDependencies: [] })
        );

        // Act
        const result = await service.coordinateModelRecovery(testModel, recoveryPlan);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.recoveryExecuted).toBe(true);
        expect(result.value.dependencyActions).toEqual(
          expect.objectContaining({
            repairActionsPerformed: repairActions,
            dependencyRepairSuccessful: true,
            integrityValidated: true,
            finalIntegrityCheck: expect.objectContaining({
              integrityMaintained: true,
              brokenReferences: [],
              missingDependencies: [],
            }),
          })
        );

        expect(mockNodeDependencyService.repairBrokenReferences).toHaveBeenCalledWith(
          'recoverable-model-123',
          expect.objectContaining({
            brokenReferences: ['broken-ref-456'],
            missingDependencies: ['missing-dependency-123'],
            allowRecreation: true,
          })
        );
      });
    });

    describe('CoordinateModelRecovery_WithVersionConflicts_ShouldResolveAndRestore', () => {
      it('should resolve version conflicts during recovery process', async () => {
        // Arrange
        const versionConflicts = {
          compatible: false,
          conflicts: [
            {
              type: 'SCHEMA_VERSION_MISMATCH',
              currentVersion: '2.3.1',
              expectedVersion: '2.4.0',
              severity: 'MEDIUM',
            },
            {
              type: 'DEPENDENCY_VERSION_CONFLICT',
              dependency: 'shared-library',
              currentVersion: '1.2.0',
              requiredVersion: '1.3.0',
              severity: 'HIGH',
            },
          ],
          warnings: ['Backward compatibility may be affected'],
        };

        const recoveryPlan = {
          modelId: 'recoverable-model-123',
          recoveredBy: 'admin-456',
          recoveryReason: 'Version conflict resolution and recovery',
          resolveVersionConflicts: true,
          createCompatibilityLayer: true,
        };

        jest.mocked(mockVersioningService.validateVersionCompatibility).mockResolvedValue(
          Result.ok(versionConflicts)
        );
        jest.mocked(mockVersioningService.resolveVersionDependencies).mockResolvedValue(
          Result.ok({ 
            conflictsResolved: true,
            resolutionActions: [
              'Updated schema to version 2.4.0',
              'Upgraded shared-library to version 1.3.0',
              'Created compatibility layer for legacy components',
            ],
          })
        );
        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok({ integrityMaintained: true, brokenReferences: [], missingDependencies: [] })
        );

        // Act
        const result = await service.coordinateModelRecovery(testModel, recoveryPlan);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.versioningActions).toEqual(
          expect.objectContaining({
            versionConflictsDetected: true,
            conflictResolution: expect.objectContaining({
              conflictsResolved: true,
              resolutionActions: expect.arrayContaining([
                'Updated schema to version 2.4.0',
                'Upgraded shared-library to version 1.3.0',
                'Created compatibility layer for legacy components',
              ]),
            }),
            compatibilityLayerCreated: true,
            finalVersionValidation: expect.objectContaining({
              compatible: true,
              validationPassed: true,
            }),
          })
        );

        expect(mockVersioningService.resolveVersionDependencies).toHaveBeenCalledWith(
          testModel,
          expect.objectContaining({
            conflicts: versionConflicts.conflicts,
            createCompatibilityLayer: true,
          })
        );
      });
    });
  });

  describe('Advanced Recovery Scenarios', () => {
    describe('CoordinateCascadingRecovery_WithDependentModels_ShouldRecoverHierarchy', () => {
      it('should coordinate cascading recovery of model hierarchy', async () => {
        // Arrange - Soft delete dependent model as well
        const dependentDeleteResult = relatedModel.softDelete('cascade-deleter');
        expect(dependentDeleteResult.isSuccess).toBe(true);

        const cascadingRecoveryPlan = {
          modelId: 'recoverable-model-123',
          recoveredBy: 'admin-456',
          recoveryReason: 'Full hierarchy restoration',
          includeDependentModels: true,
          cascadeRecovery: true,
          dependencyRecoveryOrder: 'parent-first', // or 'dependency-first'
        };

        jest.mocked(mockNodeDependencyService.findDependentModels).mockResolvedValue(
          Result.ok(['dependent-model-789'])
        );
        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok({ integrityMaintained: true, brokenReferences: [], missingDependencies: [] })
        );

        // Act
        const result = await service.coordinateCascadingRecovery(testModel, cascadingRecoveryPlan);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            cascadingRecoveryExecuted: true,
            recoveryHierarchy: expect.objectContaining({
              parentModel: expect.objectContaining({
                modelId: 'recoverable-model-123',
                recovered: true,
                recoveryOrder: 1,
              }),
              dependentModels: expect.arrayContaining([
                expect.objectContaining({
                  modelId: 'dependent-model-789',
                  recovered: true,
                  recoveryOrder: 2,
                  relationshipToParent: 'child',
                }),
              ]),
            }),
            hierarchyIntegrityValidation: expect.objectContaining({
              hierarchyIntact: true,
              relationshipsRestored: true,
              dependencyChainValid: true,
            }),
            domainEvents: expect.arrayContaining([
              expect.any(ModelUndeletedEvent), // Parent model
              expect.any(ModelUndeletedEvent), // Dependent model
            ]),
          })
        );

        expect(mockNodeDependencyService.findDependentModels).toHaveBeenCalledWith('recoverable-model-123');
      });
    });

    describe('CoordinatePartialRecovery_WithSelectiveRestoration_ShouldRecoverComponents', () => {
      it('should coordinate partial recovery of specific model components', async () => {
        // Arrange
        const partialRecoveryPlan = {
          modelId: 'recoverable-model-123',
          recoveredBy: 'admin-456',
          recoveryReason: 'Selective component restoration',
          recoveryScope: 'PARTIAL',
          componentsToRecover: {
            metadata: true,
            nodeStructure: false, // Don't recover nodes
            permissions: true,
            executionHistory: true,
          },
          preserveCurrentState: {
            nodes: true, // Keep any current node modifications
            actionNodes: true,
          },
        };

        // Act
        const result = await service.coordinatePartialRecovery(testModel, partialRecoveryPlan);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            partialRecoveryExecuted: true,
            recoveryScope: 'PARTIAL',
            componentsRecovered: expect.objectContaining({
              metadata: expect.objectContaining({
                recovered: true,
                originalData: testModel.metadata,
                restoredProperties: expect.arrayContaining(['projectId', 'department']),
              }),
              permissions: expect.objectContaining({
                recovered: true,
                restoredPermissions: testModel.permissions,
              }),
              executionHistory: expect.objectContaining({
                recovered: true,
                historicalDataPreserved: true,
              }),
            }),
            componentsPreserved: expect.objectContaining({
              nodeStructure: expect.objectContaining({
                preserved: true,
                reason: 'User specified preservation',
              }),
              actionNodes: expect.objectContaining({
                preserved: true,
                currentStateKept: true,
              }),
            }),
            auditData: expect.objectContaining({
              recoveryType: 'SELECTIVE_COMPONENT_RECOVERY',
              selectiveRecoveryDetails: expect.objectContaining({
                componentsRecovered: ['metadata', 'permissions', 'executionHistory'],
                componentsSkipped: ['nodeStructure'],
                preservationDecisions: expect.any(Object),
              }),
            }),
          })
        );
      });
    });
  });

  describe('Recovery Validation and Quality Assurance', () => {
    describe('ValidateRecoveryIntegrity_PostRecovery_ShouldEnsureModelIntegrity', () => {
      it('should validate complete model integrity after recovery', async () => {
        // Arrange - Simulate recovered model
        const recoveryRequest = {
          modelId: 'recoverable-model-123',
          recoveredBy: 'admin-456',
          recoveryReason: 'Integrity validation test',
        };

        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok({ integrityMaintained: true, brokenReferences: [], missingDependencies: [] })
        );

        // Act
        const result = await service.validateRecoveryIntegrity(testModel, recoveryRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            integrityValidationPassed: true,
            validationResults: expect.objectContaining({
              modelStateValidation: expect.objectContaining({
                isValid: true,
                modelNotDeleted: true,
                requiredPropertiesPresent: true,
                metadataIntact: true,
              }),
              dependencyValidation: expect.objectContaining({
                integrityMaintained: true,
                referencesValid: true,
                dependenciesResolved: true,
              }),
              businessRuleValidation: expect.objectContaining({
                allRulesSatisfied: true,
                noViolationsDetected: true,
              }),
              dataConsistencyValidation: expect.objectContaining({
                dataConsistent: true,
                noCorruptionDetected: true,
                auditTrailComplete: true,
              }),
            }),
            qualityMetrics: expect.objectContaining({
              recoverySuccessRate: 100,
              dataPreservationRate: 100,
              integrityScore: 100,
              performanceImpact: 'MINIMAL',
            }),
          })
        );
      });
    });

    describe('ValidateRecoveryIntegrity_WithIssues_ShouldIdentifyProblems', () => {
      it('should identify and report integrity issues post-recovery', async () => {
        // Arrange - Mock integrity issues
        const integrityIssues = {
          integrityMaintained: false,
          brokenReferences: ['ref-issue-1'],
          missingDependencies: [],
          dataInconsistencies: ['metadata-mismatch-field'],
        };

        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok(integrityIssues)
        );

        const recoveryRequest = {
          modelId: 'recoverable-model-123',
          recoveredBy: 'admin-456',
          recoveryReason: 'Testing integrity issues',
        };

        // Act
        const result = await service.validateRecoveryIntegrity(testModel, recoveryRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.integrityValidationPassed).toBe(false);
        expect(result.value.detectedIssues).toEqual(
          expect.objectContaining({
            dependencyIssues: expect.objectContaining({
              brokenReferences: ['ref-issue-1'],
            }),
            dataConsistencyIssues: expect.objectContaining({
              inconsistentFields: ['metadata-mismatch-field'],
            }),
          })
        );

        expect(result.value.remediationPlan).toEqual(
          expect.objectContaining({
            immediateActions: expect.arrayContaining([
              expect.objectContaining({
                action: 'REPAIR_BROKEN_REFERENCE',
                target: 'ref-issue-1',
                priority: 'HIGH',
              }),
            ]),
            dataRepairActions: expect.arrayContaining([
              expect.objectContaining({
                action: 'FIX_METADATA_INCONSISTENCY',
                field: 'metadata-mismatch-field',
                priority: 'MEDIUM',
              }),
            ]),
          })
        );
      });
    });
  });

  describe('Clean Architecture Recovery Service Compliance', () => {
    describe('RecoveryServiceCoordination_ShouldUseOnlyDomainDependencies', () => {
      it('should coordinate recovery using only domain services and entities', () => {
        // Arrange & Assert - Constructor and dependencies demonstrate Clean Architecture
        expect(service).toBeDefined();
        expect(service.constructor.name).toBe('ModelRecoveryService');
        
        // Service should only depend on other domain services, not infrastructure
        const dependencies = [
          mockNodeDependencyService,
          mockVersioningService,
        ];

        dependencies.forEach(dep => {
          expect(dep).toBeDefined();
          // Verify these are domain services, not infrastructure implementations
          expect(typeof dep.validateDependencyIntegrity).toBe('function');
        });

        // Verify versioning service methods
        expect(typeof mockVersioningService.validateVersionCompatibility).toBe('function');
        expect(typeof mockVersioningService.resolveVersionDependencies).toBe('function');
      });
    });

    describe('DomainEventGeneration_ForRecovery_ShouldFollowEventSourcingPatterns', () => {
      it('should generate appropriate domain events for recovery operations', async () => {
        // Arrange
        const recoveryPlan = {
          modelId: 'recoverable-model-123',
          recoveredBy: 'event-tester',
          recoveryReason: 'Domain event testing',
        };

        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.ok({ integrityMaintained: true, brokenReferences: [], missingDependencies: [] })
        );
        jest.mocked(mockVersioningService.createRestorationVersion).mockResolvedValue(
          Result.ok({ versionCreated: true, newVersion: '2.3.2' })
        );

        // Act
        const result = await service.coordinateModelRecovery(testModel, recoveryPlan);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.domainEvents).toHaveLength(2); // Undeleted + Restored events
        
        const undeletedEvent = result.value.domainEvents.find(e => e instanceof ModelUndeletedEvent);
        const restoredEvent = result.value.domainEvents.find(e => e instanceof ModelRestoredEvent);
        
        expect(undeletedEvent).toBeDefined();
        expect(undeletedEvent.aggregateId).toBe('recoverable-model-123');
        expect(undeletedEvent.getEventData()).toEqual(
          expect.objectContaining({
            modelId: 'recoverable-model-123',
            restoredBy: 'event-tester',
            restoredAt: expect.any(Date),
          })
        );

        expect(restoredEvent).toBeDefined();
        expect(restoredEvent.aggregateId).toBe('recoverable-model-123');
      });
    });

    describe('ErrorHandling_ShouldUseResultPattern', () => {
      it('should use Result pattern for error handling throughout recovery coordination', async () => {
        // Arrange
        const recoveryPlan = {
          modelId: 'recoverable-model-123',
          recoveredBy: 'error-tester',
          recoveryReason: 'Error handling test',
        };

        // Mock dependency service failure
        jest.mocked(mockNodeDependencyService.validateDependencyIntegrity).mockResolvedValue(
          Result.fail('Dependency validation service unavailable')
        );

        // Act
        const result = await service.coordinateModelRecovery(testModel, recoveryPlan);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Dependency validation service unavailable');
        
        // Verify no partial state changes occurred
        expect(testModel.isDeleted()).toBe(true); // Should remain deleted due to failure
      });
    });
  });
});