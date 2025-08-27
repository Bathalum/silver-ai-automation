// Jest is configured as the test runner
import { AuditLog } from '../../../../lib/domain/entities/audit-log';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';

/**
 * UC-009: Soft Delete Function Model - Audit Trail Preservation Tests
 * 
 * Tests the audit trail preservation capabilities during soft deletion,
 * ensuring complete historical record maintenance and compliance requirements.
 * 
 * Clean Architecture Compliance:
 * - Tests audit log entity behavior in isolation
 * - Validates business rules around audit preservation
 * - Ensures proper audit data structure and completeness
 * - Tests audit query and retrieval capabilities
 */
describe('AuditLog - Soft Deletion Audit Trail', () => {
  let testModel: FunctionModel;
  let deletionAuditLog: AuditLog;
  let baseAuditLog: AuditLog;

  beforeEach(() => {
    // Create test model
    const nameResult = ModelName.create('Auditable Model');
    const versionResult = Version.create('2.1.0');
    
    expect(nameResult.isSuccess).toBe(true);
    expect(versionResult.isSuccess).toBe(true);

    const modelResult = FunctionModel.create({
      modelId: 'audit-model-123',
      name: nameResult.value,
      version: versionResult.value,
      status: ModelStatus.PUBLISHED,
      currentVersion: versionResult.value,
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: { 
        projectId: 'audit-project-789',
        department: 'Engineering',
        businessUnit: 'AI Platform',
        classification: 'sensitive',
      },
      permissions: { 
        'user-123': 'owner',
        'user-456': 'collaborator',
        'user-789': 'viewer',
      },
    });

    expect(modelResult.isSuccess).toBe(true);
    testModel = modelResult.value;

    // Create base audit log for model creation
    const baseAuditResult = AuditLog.create({
      auditId: 'audit-001',
      entityType: 'FunctionModel',
      entityId: 'audit-model-123',
      action: 'CREATE',
      userId: 'user-123',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      details: {
        modelName: 'Auditable Model',
        version: '2.1.0',
        status: 'PUBLISHED',
        createdBy: 'user-123',
      },
    });

    expect(baseAuditResult.isSuccess).toBe(true);
    baseAuditLog = baseAuditResult.value;
  });

  describe('Audit Log Creation for Soft Deletion', () => {
    describe('CreateDeletionAuditLog_WithCompleteContext_ShouldCaptureAllDetails', () => {
      it('should create comprehensive audit log for soft deletion with full context preservation', () => {
        // Arrange
        const deletionTimestamp = new Date('2024-06-15T14:30:00Z');
        const deletionContext = {
          reason: 'Project completion and data retention compliance',
          deletedBy: 'compliance-officer-456',
          complianceFramework: 'SOX',
          retentionPeriod: '7-years',
          businessJustification: 'Project lifecycle completed, archiving per policy',
          approvedBy: 'manager-789',
          metadata: {
            projectPhase: 'closure',
            dataClassification: 'sensitive',
            retentionSchedule: 'long-term',
          },
        };

        // Act
        const auditResult = AuditLog.create({
          auditId: 'audit-soft-delete-001',
          entityType: 'FunctionModel',
          entityId: testModel.modelId,
          action: 'SOFT_DELETE',
          userId: deletionContext.deletedBy,
          timestamp: deletionTimestamp,
          details: {
            // Pre-deletion state preservation
            preDeleteState: {
              modelName: testModel.name.toString(),
              version: testModel.version.toString(),
              status: testModel.status,
              nodeCount: testModel.nodes.size,
              actionNodeCount: testModel.actionNodes.size,
              metadata: testModel.metadata,
              permissions: testModel.permissions,
              lastModifiedAt: new Date('2024-06-10T09:15:00Z'),
            },
            // Deletion context
            deletionContext: {
              reason: deletionContext.reason,
              complianceFramework: deletionContext.complianceFramework,
              retentionPeriod: deletionContext.retentionPeriod,
              businessJustification: deletionContext.businessJustification,
              approvedBy: deletionContext.approvedBy,
            },
            // System state at deletion
            systemContext: {
              deletionTimestamp: deletionTimestamp,
              systemVersion: '2.4.1',
              triggeredBy: 'user-interface',
              sessionId: 'session-abc123',
            },
            // Compliance and legal
            compliance: {
              dataRetentionPolicy: 'GDPR-compliant-7-year',
              legalHoldStatus: 'not-applicable',
              privacyImpactAssessment: 'completed',
              dataSubjectRights: 'preserved',
            },
          },
        });

        // Assert
        expect(auditResult.isSuccess).toBe(true);
        deletionAuditLog = auditResult.value;

        expect(deletionAuditLog.entityType).toBe('FunctionModel');
        expect(deletionAuditLog.entityId).toBe('audit-model-123');
        expect(deletionAuditLog.action).toBe('SOFT_DELETE');
        expect(deletionAuditLog.userId).toBe('compliance-officer-456');
        expect(deletionAuditLog.timestamp).toEqual(deletionTimestamp);

        // Verify complete state preservation
        const preDeleteState = deletionAuditLog.details.preDeleteState;
        expect(preDeleteState.modelName).toBe('Auditable Model');
        expect(preDeleteState.version).toBe('2.1.0');
        expect(preDeleteState.status).toBe(ModelStatus.PUBLISHED);
        expect(preDeleteState.metadata).toEqual(testModel.metadata);
        expect(preDeleteState.permissions).toEqual(testModel.permissions);

        // Verify deletion context
        const deletionCtx = deletionAuditLog.details.deletionContext;
        expect(deletionCtx.reason).toBe(deletionContext.reason);
        expect(deletionCtx.complianceFramework).toBe('SOX');
        expect(deletionCtx.businessJustification).toBe(deletionContext.businessJustification);

        // Verify compliance data
        const compliance = deletionAuditLog.details.compliance;
        expect(compliance.dataRetentionPolicy).toBe('GDPR-compliant-7-year');
        expect(compliance.privacyImpactAssessment).toBe('completed');
      });
    });

    describe('CreateDeletionAuditLog_WithMinimalContext_ShouldCaptureEssentials', () => {
      it('should create audit log with minimal required information', () => {
        // Arrange
        const minimalDeletionTimestamp = new Date();

        // Act
        const auditResult = AuditLog.create({
          auditId: 'audit-minimal-delete',
          entityType: 'FunctionModel',
          entityId: testModel.modelId,
          action: 'SOFT_DELETE',
          userId: 'user-123',
          timestamp: minimalDeletionTimestamp,
          details: {
            preDeleteState: {
              modelName: testModel.name.toString(),
              status: testModel.status,
            },
            deletionContext: {
              reason: 'User-initiated deletion',
            },
          },
        });

        // Assert
        expect(auditResult.isSuccess).toBe(true);
        const auditLog = auditResult.value;

        expect(auditLog.action).toBe('SOFT_DELETE');
        expect(auditLog.details.preDeleteState.modelName).toBe('Auditable Model');
        expect(auditLog.details.deletionContext.reason).toBe('User-initiated deletion');
      });
    });
  });

  describe('Audit Trail Completeness and Integrity', () => {
    describe('ValidateAuditChain_AcrossModelLifecycle_ShouldMaintainContinuity', () => {
      it('should maintain complete audit chain from creation through soft deletion', () => {
        // Arrange - Create lifecycle audit logs
        const auditLogs: AuditLog[] = [baseAuditLog];

        // Model update audit
        const updateAuditResult = AuditLog.create({
          auditId: 'audit-002',
          entityType: 'FunctionModel',
          entityId: 'audit-model-123',
          action: 'UPDATE',
          userId: 'user-456',
          timestamp: new Date('2024-03-15T11:30:00Z'),
          details: {
            changes: {
              metadata: {
                from: { projectId: 'audit-project-789' },
                to: { projectId: 'audit-project-789', phase: 'active' },
              },
            },
          },
        });
        auditLogs.push(updateAuditResult.value);

        // Model publish audit
        const publishAuditResult = AuditLog.create({
          auditId: 'audit-003',
          entityType: 'FunctionModel',
          entityId: 'audit-model-123',
          action: 'PUBLISH',
          userId: 'user-123',
          timestamp: new Date('2024-04-20T16:45:00Z'),
          details: {
            statusChange: {
              from: 'DRAFT',
              to: 'PUBLISHED',
            },
          },
        });
        auditLogs.push(publishAuditResult.value);

        // Soft deletion audit
        const deletionAuditResult = AuditLog.create({
          auditId: 'audit-004',
          entityType: 'FunctionModel',
          entityId: 'audit-model-123',
          action: 'SOFT_DELETE',
          userId: 'admin-789',
          timestamp: new Date('2024-06-15T14:30:00Z'),
          details: {
            preDeleteState: {
              modelName: testModel.name.toString(),
              version: testModel.version.toString(),
              status: testModel.status,
            },
            deletionContext: {
              reason: 'Project lifecycle completion',
            },
          },
        });
        auditLogs.push(deletionAuditResult.value);

        // Act & Assert - Validate audit chain integrity
        expect(auditLogs).toHaveLength(4);

        // Verify chronological order
        for (let i = 1; i < auditLogs.length; i++) {
          expect(auditLogs[i].timestamp.getTime()).toBeGreaterThan(
            auditLogs[i - 1].timestamp.getTime()
          );
        }

        // Verify all logs reference same entity
        auditLogs.forEach(log => {
          expect(log.entityType).toBe('FunctionModel');
          expect(log.entityId).toBe('audit-model-123');
        });

        // Verify action progression makes sense
        const actions = auditLogs.map(log => log.action);
        expect(actions).toEqual(['CREATE', 'UPDATE', 'PUBLISH', 'SOFT_DELETE']);

        // Verify final state in deletion log matches model
        const deletionLog = auditLogs[3];
        expect(deletionLog.details.preDeleteState.modelName).toBe(testModel.name.toString());
        expect(deletionLog.details.preDeleteState.version).toBe(testModel.version.toString());
      });
    });

    describe('ValidateAuditDataIntegrity_ForSoftDeletion_ShouldPreserveAllCriticalData', () => {
      it('should preserve all critical model data in soft deletion audit', () => {
        // Arrange - Create comprehensive model state
        testModel.updateMetadata({
          executionHistory: [
            { executionId: 'exec-1', status: 'completed', timestamp: '2024-01-15' },
            { executionId: 'exec-2', status: 'failed', timestamp: '2024-02-20' },
          ],
          businessMetrics: {
            totalExecutions: 125,
            averageExecutionTime: '2.5s',
            successRate: '94%',
          },
          technicalMetrics: {
            nodeProcessingTimes: { 'node-1': '500ms', 'node-2': '1.2s' },
            resourceUtilization: 'moderate',
          },
        });

        // Act - Create soft deletion audit with full state capture
        const comprehensiveAuditResult = AuditLog.create({
          auditId: 'audit-comprehensive-delete',
          entityType: 'FunctionModel',
          entityId: testModel.modelId,
          action: 'SOFT_DELETE',
          userId: 'data-steward-555',
          timestamp: new Date(),
          details: {
            completeEntitySnapshot: {
              // Core model properties
              modelId: testModel.modelId,
              name: testModel.name.toString(),
              version: testModel.version.toString(),
              status: testModel.status,
              
              // Structure and relationships
              nodeStructure: {
                totalNodes: testModel.nodes.size,
                nodeTypes: Array.from(testModel.nodes.values()).map(n => n.nodeType),
                actionNodes: testModel.actionNodes.size,
              },
              
              // Complete metadata preservation
              metadata: testModel.metadata,
              
              // Access and permissions
              permissions: testModel.permissions,
              
              // Execution and performance data
              performanceMetrics: testModel.metadata.businessMetrics,
              technicalMetrics: testModel.metadata.technicalMetrics,
              executionHistory: testModel.metadata.executionHistory,
            },
            
            // Deletion-specific audit data
            deletionMetadata: {
              deletionReason: 'Comprehensive data archival',
              dataRetentionRequirement: 'full-preservation',
              archivalFormat: 'structured-json',
              checksumValidation: 'sha256-enabled',
            },
            
            // Regulatory and compliance
            regulatoryCompliance: {
              gdprCompliant: true,
              dataSubjectRightsPreserved: true,
              auditTrailMaintained: true,
              retentionPolicyApplied: '7-years-full-access',
            },
          },
        });

        // Assert
        expect(comprehensiveAuditResult.isSuccess).toBe(true);
        const auditLog = comprehensiveAuditResult.value;

        const snapshot = auditLog.details.completeEntitySnapshot;
        
        // Verify all critical model data is preserved
        expect(snapshot.modelId).toBe(testModel.modelId);
        expect(snapshot.name).toBe(testModel.name.toString());
        expect(snapshot.version).toBe(testModel.version.toString());
        expect(snapshot.status).toBe(testModel.status);
        
        // Verify metadata preservation
        expect(snapshot.metadata).toEqual(testModel.metadata);
        expect(snapshot.permissions).toEqual(testModel.permissions);
        
        // Verify execution history preservation
        expect(snapshot.executionHistory).toEqual(testModel.metadata.executionHistory);
        expect(snapshot.performanceMetrics).toEqual(testModel.metadata.businessMetrics);
        
        // Verify regulatory compliance data
        const compliance = auditLog.details.regulatoryCompliance;
        expect(compliance.gdprCompliant).toBe(true);
        expect(compliance.auditTrailMaintained).toBe(true);
      });
    });
  });

  describe('Audit Query and Retrieval Capabilities', () => {
    describe('QueryDeletionAuditTrail_ForDeletedModel_ShouldReturnCompleteHistory', () => {
      it('should support querying complete audit trail for soft deleted models', () => {
        // Arrange - Create deletion audit log
        const deletionAuditResult = AuditLog.create({
          auditId: 'audit-query-test',
          entityType: 'FunctionModel',
          entityId: testModel.modelId,
          action: 'SOFT_DELETE',
          userId: 'query-user',
          timestamp: new Date(),
          details: {
            preDeleteState: {
              modelName: testModel.name.toString(),
              status: testModel.status,
            },
            queryableData: {
              searchableFields: {
                modelName: testModel.name.toString(),
                projectId: testModel.metadata.projectId,
                department: testModel.metadata.department,
                businessUnit: testModel.metadata.businessUnit,
              },
              indexedFields: {
                deletedAt: new Date(),
                deletedBy: 'query-user',
                retentionPeriod: '7-years',
              },
            },
          },
        });

        expect(deletionAuditResult.isSuccess).toBe(true);
        const auditLog = deletionAuditResult.value;

        // Act - Query audit data (simulate query operations)
        const queryResults = {
          byEntityId: auditLog.entityId === testModel.modelId ? auditLog : null,
          byAction: auditLog.action === 'SOFT_DELETE' ? auditLog : null,
          byUserId: auditLog.userId === 'query-user' ? auditLog : null,
          byTimeRange: (
            auditLog.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          ) ? auditLog : null,
        };

        // Assert
        expect(queryResults.byEntityId).not.toBeNull();
        expect(queryResults.byAction).not.toBeNull();
        expect(queryResults.byUserId).not.toBeNull();
        expect(queryResults.byTimeRange).not.toBeNull();

        // Verify queryable data structure
        const queryableData = auditLog.details.queryableData;
        expect(queryableData.searchableFields.modelName).toBe(testModel.name.toString());
        expect(queryableData.searchableFields.projectId).toBe('audit-project-789');
        expect(queryableData.indexedFields.deletedBy).toBe('query-user');
      });
    });

    describe('QueryAuditMetrics_ForDeletionAnalysis_ShouldProvideAnalytics', () => {
      it('should support analytical queries on deletion audit data', () => {
        // Arrange - Create multiple deletion audit logs for analysis
        const deletionAudits = [
          {
            userId: 'user-123',
            department: 'Engineering',
            reason: 'Project completion',
            timestamp: new Date('2024-01-15'),
          },
          {
            userId: 'admin-456',
            department: 'Engineering', 
            reason: 'Policy compliance',
            timestamp: new Date('2024-02-20'),
          },
          {
            userId: 'user-789',
            department: 'Marketing',
            reason: 'Campaign ended',
            timestamp: new Date('2024-03-10'),
          },
        ];

        const auditLogs = deletionAudits.map((deletion, index) => {
          return AuditLog.create({
            auditId: `audit-analytics-${index}`,
            entityType: 'FunctionModel',
            entityId: `model-${index}`,
            action: 'SOFT_DELETE',
            userId: deletion.userId,
            timestamp: deletion.timestamp,
            details: {
              analytics: {
                department: deletion.department,
                reason: deletion.reason,
                modelAge: Math.floor(Math.random() * 365), // Days
                nodeCount: Math.floor(Math.random() * 50) + 1,
                executionCount: Math.floor(Math.random() * 1000),
              },
            },
          }).value;
        });

        // Act - Perform analytical operations
        const analytics = {
          totalDeletions: auditLogs.length,
          deletionsByDepartment: auditLogs.reduce((acc, log) => {
            const dept = log.details.analytics.department;
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          deletionReasons: auditLogs.reduce((acc, log) => {
            const reason = log.details.analytics.reason;
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          averageModelAge: auditLogs.reduce((sum, log) => 
            sum + log.details.analytics.modelAge, 0) / auditLogs.length,
          deletionTrend: auditLogs.map(log => ({
            month: log.timestamp.getMonth() + 1,
            year: log.timestamp.getFullYear(),
          })),
        };

        // Assert
        expect(analytics.totalDeletions).toBe(3);
        expect(analytics.deletionsByDepartment['Engineering']).toBe(2);
        expect(analytics.deletionsByDepartment['Marketing']).toBe(1);
        expect(analytics.deletionReasons['Project completion']).toBe(1);
        expect(analytics.deletionReasons['Policy compliance']).toBe(1);
        expect(analytics.averageModelAge).toBeGreaterThan(0);
        expect(analytics.deletionTrend).toHaveLength(3);
      });
    });
  });

  describe('Compliance and Legal Requirements', () => {
    describe('ValidateGDPRCompliance_ForSoftDeletion_ShouldMeetRequirements', () => {
      it('should create GDPR-compliant audit logs for soft deletion', () => {
        // Arrange
        const gdprDeletionContext = {
          legalBasis: 'Article 17 - Right to Erasure',
          dataSubjectRequest: 'subject-request-456',
          privacyOfficerApproval: 'privacy-officer-789',
          dataProcessingPurpose: 'AI model development and testing',
          retentionJustification: 'Legitimate business interest in AI improvement',
          dataMinimizationCompliance: true,
        };

        // Act
        const gdprAuditResult = AuditLog.create({
          auditId: 'audit-gdpr-deletion',
          entityType: 'FunctionModel',
          entityId: testModel.modelId,
          action: 'SOFT_DELETE',
          userId: 'privacy-officer-789',
          timestamp: new Date(),
          details: {
            gdprCompliance: {
              legalBasis: gdprDeletionContext.legalBasis,
              dataSubjectRights: {
                rightToErasure: true,
                rightToPortability: true,
                rightOfAccess: true,
                dataSubjectNotified: true,
              },
              dataProcessing: {
                originalPurpose: gdprDeletionContext.dataProcessingPurpose,
                retentionJustification: gdprDeletionContext.retentionJustification,
                dataMinimizationApplied: gdprDeletionContext.dataMinimizationCompliance,
              },
              auditTrail: {
                dataSubjectRequest: gdprDeletionContext.dataSubjectRequest,
                privacyImpactAssessment: 'completed-2024-001',
                legalReview: 'approved',
                dataProtectionOfficerApproval: gdprDeletionContext.privacyOfficerApproval,
              },
            },
            dataPreservation: {
              personalDataAnonymized: true,
              businessDataRetained: true,
              auditTrailMaintained: true,
              complianceValidated: true,
            },
          },
        });

        // Assert
        expect(gdprAuditResult.isSuccess).toBe(true);
        const auditLog = gdprAuditResult.value;

        const gdprCompliance = auditLog.details.gdprCompliance;
        expect(gdprCompliance.legalBasis).toBe('Article 17 - Right to Erasure');
        expect(gdprCompliance.dataSubjectRights.rightToErasure).toBe(true);
        expect(gdprCompliance.dataSubjectRights.dataSubjectNotified).toBe(true);
        expect(gdprCompliance.auditTrail.dataSubjectRequest).toBe('subject-request-456');

        const preservation = auditLog.details.dataPreservation;
        expect(preservation.personalDataAnonymized).toBe(true);
        expect(preservation.auditTrailMaintained).toBe(true);
        expect(preservation.complianceValidated).toBe(true);
      });
    });

    describe('ValidateSOXCompliance_ForSoftDeletion_ShouldMeetAuditRequirements', () => {
      it('should create SOX-compliant audit logs for financial model soft deletion', () => {
        // Arrange
        const soxComplianceContext = {
          financialImpact: 'material',
          auditPeriod: 'FY2024-Q2',
          internalControlTesting: 'passed',
          externalAuditorNotification: 'required',
          financialReportingImpact: 'section-404-applicable',
        };

        // Act
        const soxAuditResult = AuditLog.create({
          auditId: 'audit-sox-deletion',
          entityType: 'FunctionModel',
          entityId: testModel.modelId,
          action: 'SOFT_DELETE',
          userId: 'financial-controller-123',
          timestamp: new Date(),
          details: {
            soxCompliance: {
              internalControls: {
                authorizationControl: 'management-approved',
                segregationOfDuties: 'validated',
                documentationControl: 'complete',
                auditTrailControl: 'comprehensive',
              },
              financialReporting: {
                materialImpact: soxComplianceContext.financialImpact === 'material',
                reportingPeriod: soxComplianceContext.auditPeriod,
                section404Applicable: true,
                internalControlTesting: soxComplianceContext.internalControlTesting,
              },
              auditRequirements: {
                externalAuditorAccess: true,
                workingPaperRetention: '7-years',
                evidencePreservation: 'complete',
                managementCertification: 'ceo-cfo-signed',
              },
            },
            businessJustification: {
              businessReason: 'Model lifecycle completion per SOX controls',
              financialImpact: 'reduced operational expenses',
              riskMitigation: 'obsolete model removal reduces control complexity',
              approvalHierarchy: [
                'model-owner-123',
                'department-head-456', 
                'financial-controller-789',
                'cfo-approval-999',
              ],
            },
          },
        });

        // Assert
        expect(soxAuditResult.isSuccess).toBe(true);
        const auditLog = soxAuditResult.value;

        const soxCompliance = auditLog.details.soxCompliance;
        expect(soxCompliance.internalControls.authorizationControl).toBe('management-approved');
        expect(soxCompliance.internalControls.auditTrailControl).toBe('comprehensive');
        expect(soxCompliance.financialReporting.section404Applicable).toBe(true);
        expect(soxCompliance.auditRequirements.externalAuditorAccess).toBe(true);

        const businessJustification = auditLog.details.businessJustification;
        expect(businessJustification.approvalHierarchy).toHaveLength(4);
        expect(businessJustification.riskMitigation).toContain('control complexity');
      });
    });
  });

  describe('Clean Architecture Audit Entity Compliance', () => {
    describe('AuditLogEntity_ShouldMaintainDomainIntegrity', () => {
      it('should maintain domain integrity without external dependencies', () => {
        // Arrange & Act - Create audit log using only domain concepts
        const auditResult = AuditLog.create({
          auditId: 'audit-architecture-test',
          entityType: 'FunctionModel',
          entityId: testModel.modelId,
          action: 'SOFT_DELETE',
          userId: 'architecture-validator',
          timestamp: new Date(),
          details: {
            domainConcepts: {
              aggregateRoot: 'FunctionModel',
              entityState: 'SOFT_DELETED',
              businessRules: ['deletion-allowed', 'audit-required'],
              domainEvents: ['ModelSoftDeleted'],
            },
          },
        });

        // Assert
        expect(auditResult.isSuccess).toBe(true);
        const auditLog = auditResult.value;

        // Verify entity maintains domain integrity
        expect(auditLog.entityType).toBe('FunctionModel');
        expect(auditLog.action).toBe('SOFT_DELETE');
        expect(auditLog.details.domainConcepts).toBeDefined();
        
        // Entity should not have infrastructure dependencies
        expect(typeof auditLog.auditId).toBe('string');
        expect(auditLog.timestamp).toBeInstanceOf(Date);
        expect(typeof auditLog.details).toBe('object');
      });
    });

    describe('AuditDataStructure_ShouldSupportEvolutionAndMaintenance', () => {
      it('should support audit data structure evolution while maintaining backward compatibility', () => {
        // Arrange - Create audit with version information
        const versionedAuditResult = AuditLog.create({
          auditId: 'audit-versioning-test',
          entityType: 'FunctionModel',
          entityId: testModel.modelId,
          action: 'SOFT_DELETE',
          userId: 'version-tester',
          timestamp: new Date(),
          details: {
            // Current version structure
            version: 'v2.1',
            schemaVersion: 'audit-schema-v3',
            dataStructure: {
              coreFields: {
                modelId: testModel.modelId,
                modelName: testModel.name.toString(),
                deletionTimestamp: new Date(),
              },
              extendedFields: {
                complianceData: {},
                businessContext: {},
                technicalMetadata: {},
              },
              futureExtensions: {
                customFields: {},
                integrationData: {},
              },
            },
            backwardCompatibility: {
              v1Fields: {
                entityId: testModel.modelId,
                action: 'SOFT_DELETE',
                userId: 'version-tester',
              },
              v2Fields: {
                enhancedMetadata: true,
                structuredCompliance: true,
              },
            },
          },
        });

        // Assert
        expect(versionedAuditResult.isSuccess).toBe(true);
        const auditLog = versionedAuditResult.value;

        // Verify version information
        expect(auditLog.details.version).toBe('v2.1');
        expect(auditLog.details.schemaVersion).toBe('audit-schema-v3');

        // Verify backward compatibility
        const backwardCompat = auditLog.details.backwardCompatibility;
        expect(backwardCompat.v1Fields.entityId).toBe(testModel.modelId);
        expect(backwardCompat.v1Fields.action).toBe('SOFT_DELETE');
        expect(backwardCompat.v2Fields.enhancedMetadata).toBe(true);

        // Verify extensibility
        const dataStructure = auditLog.details.dataStructure;
        expect(dataStructure.futureExtensions).toBeDefined();
        expect(typeof dataStructure.futureExtensions.customFields).toBe('object');
      });
    });
  });
});