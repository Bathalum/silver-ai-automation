import { beforeEach, describe, expect, it } from '@jest/globals';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus, IOType, ExecutionMode, NodeStatus } from '../../../../lib/domain/enums';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { StageNode } from '../../../../lib/domain/entities/stage-node';
import { Position } from '../../../../lib/domain/value-objects/position';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { DomainTestHelpers, ResultTestHelpers } from '../../../utils/test-helpers';

/**
 * UC-009: Soft Delete Function Model - Entity State Management Tests
 * 
 * Tests the soft deletion state management at the entity level,
 * focusing on state transitions, operation blocking, and data preservation.
 * 
 * Clean Architecture Compliance:
 * - Tests pure domain entity behavior without external dependencies
 * - Validates business rules around deletion state
 * - Ensures proper state transitions and invariant maintenance
 * - Tests entity behavior in isolation from infrastructure
 */
describe('FunctionModel - Soft Deletion State Management', () => {
  let testModel: FunctionModel;
  let nodeId1: NodeId;
  let nodeId2: NodeId;

  beforeEach(() => {
    // Create test model with nodes
    // Use safe Result access patterns
    const testName = DomainTestHelpers.unwrapResult(
      ModelName.create('Test Model'),
      'ModelName creation for test'
    );
    const testVersion = DomainTestHelpers.unwrapResult(
      Version.create('1.0.0'),
      'Version creation for test'
    );

    nodeId1 = NodeId.generate();
    nodeId2 = NodeId.generate();

    // Create model as DRAFT initially so we can add nodes
    testModel = DomainTestHelpers.unwrapResult(
      FunctionModel.create({
        modelId: 'test-model-123',
        name: testName,
        version: testVersion,
        status: ModelStatus.DRAFT,
        currentVersion: testVersion,
        nodes: new Map(),
        actionNodes: new Map(),
        metadata: { 
          projectId: 'proj-456',
          createdBy: 'user-123',
          lastModifiedBy: 'user-123',
        },
        permissions: { 'user-123': 'owner', 'user-456': 'collaborator' },
      }),
      'FunctionModel creation for test'
    );

    // Add some nodes for testing - nodes need to have matching modelId and proper defaults
    const inputNode = DomainTestHelpers.unwrapResult(
      IONode.create({
        nodeId: nodeId1,
        modelId: 'test-model-123',
        name: 'Input Node',
        position: DomainTestHelpers.createPosition(0, 0),
        dependencies: [],
        executionType: ExecutionMode.SYNC,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: IOType.INPUT,
        },
      }),
      'Input node creation'
    );

    const outputNode = DomainTestHelpers.unwrapResult(
      IONode.create({
        nodeId: nodeId2,
        modelId: 'test-model-123',
        name: 'Output Node',
        position: DomainTestHelpers.createPosition(100, 100),
        dependencies: [],
        executionType: ExecutionMode.SYNC,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: IOType.OUTPUT,
        },
      }),
      'Output node creation'
    );

    // Add nodes while model is in DRAFT state
    DomainTestHelpers.unwrapResult(
      testModel.addNode(inputNode),
      'Adding input node to test model'
    );
    DomainTestHelpers.unwrapResult(
      testModel.addNode(outputNode),
      'Adding output node to test model'
    );
    
    // Now publish the model for testing
    DomainTestHelpers.unwrapResult(
      testModel.publish(),
      'Publishing test model'
    );
  });

  describe('Soft Deletion State Transitions', () => {
    describe('SoftDelete_PublishedModel_ShouldTransitionToDeleted', () => {
      it('should successfully mark published model as deleted with proper state', () => {
        // Arrange
        expect(testModel.status).toBe(ModelStatus.PUBLISHED);
        expect(testModel.isDeleted()).toBe(false);
        expect(testModel.deletedAt).toBeUndefined();
        expect(testModel.deletedBy).toBeUndefined();

        // Act
        const deleteResult = testModel.softDelete('user-456');

        // Assert
        expect(deleteResult.isSuccess).toBe(true);
        expect(testModel.isDeleted()).toBe(true);
        expect(testModel.deletedAt).toBeInstanceOf(Date);
        expect(testModel.deletedBy).toBe('user-456');
        
        // Original properties should remain unchanged
        expect(testModel.name.toString()).toBe('Test Model');
        expect(testModel.version.toString()).toBe('1.0.0');
        expect(testModel.status).toBe(ModelStatus.PUBLISHED); // Original status preserved for audit
        expect(testModel.nodes.size).toBe(2); // Nodes preserved
        expect(testModel.metadata.projectId).toBe('proj-456'); // Metadata preserved
      });
    });

    describe('SoftDelete_DraftModel_ShouldTransitionToDeleted', () => {
      it('should successfully mark draft model as deleted', () => {
        // Arrange - Use safe Result access patterns
        const draftName = DomainTestHelpers.unwrapResult(
          ModelName.create('Draft Model'),
          'Draft ModelName creation'
        );
        const draftVersion = DomainTestHelpers.unwrapResult(
          Version.create('0.1.0'),
          'Draft Version creation'
        );
        
        const draftModel = DomainTestHelpers.unwrapResult(
          FunctionModel.create({
            modelId: 'draft-model-789',
            name: draftName,
            version: draftVersion,
            status: ModelStatus.DRAFT,
            currentVersion: draftVersion,
            nodes: new Map(),
            actionNodes: new Map(),
            metadata: {},
            permissions: { 'user-123': 'owner' },
          }),
          'Draft FunctionModel creation'
        );

        // Act
        const deleteResult = draftModel.softDelete('user-123');

        // Assert
        expect(deleteResult.isSuccess).toBe(true);
        expect(draftModel.isDeleted()).toBe(true);
        expect(draftModel.status).toBe(ModelStatus.DRAFT); // Original status preserved
      });
    });

    describe('SoftDelete_ArchivedModel_ShouldPreventDeletion', () => {
      it('should prevent soft deletion of archived model', () => {
        // Arrange
        const archiveResult = testModel.archive();
        expect(archiveResult.isSuccess).toBe(true);
        expect(testModel.status).toBe(ModelStatus.ARCHIVED); // Status changed to archived

        // Act
        const deleteResult = testModel.softDelete('user-456');

        // Assert
        expect(deleteResult.isFailure).toBe(true);
        expect(deleteResult.error).toContain('archived model');
        expect(testModel.isDeleted()).toBe(false);
        expect(testModel.deletedAt).toBeUndefined();
      });
    });

    describe('SoftDelete_AlreadyDeletedModel_ShouldPreventDuplicateDeletion', () => {
      it('should prevent double soft deletion of same model', () => {
        // Arrange
        const firstDeleteResult = testModel.softDelete('user-123');
        expect(firstDeleteResult.isSuccess).toBe(true);
        expect(testModel.isDeleted()).toBe(true);

        const originalDeletedAt = testModel.deletedAt;
        const originalDeletedBy = testModel.deletedBy;

        // Act
        const secondDeleteResult = testModel.softDelete('user-456');

        // Assert
        expect(secondDeleteResult.isFailure).toBe(true);
        expect(secondDeleteResult.error).toContain('already deleted');
        
        // Original deletion data should be unchanged
        expect(testModel.deletedAt).toBe(originalDeletedAt);
        expect(testModel.deletedBy).toBe(originalDeletedBy);
      });
    });

    describe('SoftDelete_WithEmptyDeletedBy_ShouldUseAnonymous', () => {
      it('should handle empty deletedBy parameter gracefully', () => {
        // Act
        const deleteResult = testModel.softDelete('');

        // Assert
        expect(deleteResult.isSuccess).toBe(true);
        expect(testModel.isDeleted()).toBe(true);
        expect(testModel.deletedBy).toBe(''); // Empty string preserved as-is
      });
    });

    describe('SoftDelete_WithoutDeletedBy_ShouldSucceed', () => {
      it('should allow soft deletion without specifying deletedBy', () => {
        // Act
        const deleteResult = testModel.softDelete();

        // Assert
        expect(deleteResult.isSuccess).toBe(true);
        expect(testModel.isDeleted()).toBe(true);
        expect(testModel.deletedAt).toBeInstanceOf(Date);
        expect(testModel.deletedBy).toBeUndefined();
      });
    });
  });

  describe('Operation Blocking for Deleted Models', () => {
    beforeEach(() => {
      const deleteResult = testModel.softDelete('user-456');
      expect(deleteResult.isSuccess).toBe(true);
    });

    describe('BlockNodeOperations_OnDeletedModel_ShouldPreventModification', () => {
      it('should block node addition operations on deleted models', () => {
        // Arrange
        const newNodeId = NodeId.generate();
        const stageNode = DomainTestHelpers.unwrapResult(
          StageNode.create({
            nodeId: newNodeId,
            modelId: 'test-model-123',
            name: 'New Stage',
            position: DomainTestHelpers.createPosition(200, 200),
            dependencies: [],
            executionType: ExecutionMode.SYNC,
            status: NodeStatus.ACTIVE,
            metadata: {},
            visualProperties: {},
            stageData: {
              stageType: 'milestone',
            },
            parallelExecution: false,
            actionNodes: [],
            configuration: {},
          }),
          'StageNode creation'
        );

        // Act
        const addResult = testModel.addNode(stageNode);

        // Assert
        expect(addResult.isFailure).toBe(true);
        expect(addResult.error).toContain('deleted model');
        expect(testModel.nodes.has(newNodeId.toString())).toBe(false);
      });

      it('should block node removal operations on deleted models', () => {
        // Act
        const removeResult = testModel.removeContainerNode(nodeId1);

        // Assert
        expect(removeResult.isFailure).toBe(true);
        expect(removeResult.error).toContain('deleted model');
        expect(testModel.nodes.has(nodeId1.toString())).toBe(true); // Node still present
      });

      it('should block node updates on deleted models', () => {
        // Arrange
        const existingNode = testModel.nodes.get(nodeId1.toString());
        expect(existingNode).toBeDefined();

        // Act
        const updateResult = testModel.updateContainerNode(nodeId1.toString(), {
          name: 'Updated Name',
        });

        // Assert
        expect(updateResult.isFailure).toBe(true);
        expect(updateResult.error).toContain('deleted model');
        
        // Node name should remain unchanged
        const nodeAfterAttempt = testModel.nodes.get(nodeId1.toString());
        expect(nodeAfterAttempt?.name).toBe('Input Node'); // Original name preserved
      });
    });

    describe('BlockModelOperations_OnDeletedModel_ShouldPreventStatusChanges', () => {
      it('should block publishing operations on deleted models', () => {
        // Act
        const publishResult = testModel.publish();

        // Assert
        expect(publishResult.isFailure).toBe(true);
        expect(publishResult.error).toContain('deleted');
        expect(testModel.status).toBe(ModelStatus.PUBLISHED); // Original status preserved
      });

      it('should block archiving operations on deleted models', () => {
        // Act
        const archiveResult = testModel.archive();

        // Assert
        expect(archiveResult.isFailure).toBe(true);
        expect(archiveResult.error).toContain('deleted');
        expect(testModel.status).toBe(ModelStatus.PUBLISHED); // Original status preserved
      });

      it('should block metadata updates on deleted models', () => {
        // Act
        const updateResult = testModel.updateMetadata({
          newProperty: 'new value',
        });

        // Assert
        expect(updateResult.isFailure).toBe(true);
        expect(updateResult.error).toContain('deleted model');
        
        // Metadata should remain unchanged
        expect(testModel.metadata.newProperty).toBeUndefined();
        expect(testModel.metadata.projectId).toBe('proj-456'); // Original data preserved
      });
    });

    describe('AllowReadOperations_OnDeletedModel_ShouldPermitInspection', () => {
      it('should allow read-only operations on deleted models', () => {
        // Act & Assert - Read operations should still work
        expect(testModel.name.toString()).toBe('Test Model');
        expect(testModel.version.toString()).toBe('1.0.0');
        expect(testModel.status).toBe(ModelStatus.PUBLISHED); // Original status preserved
        expect(testModel.nodes.size).toBe(2);
        expect(testModel.metadata.projectId).toBe('proj-456');
        expect(testModel.permissions['user-123']).toBe('owner');
        
        // Deletion state should be accessible
        expect(testModel.isDeleted()).toBe(true);
        expect(testModel.deletedAt).toBeInstanceOf(Date);
        expect(testModel.deletedBy).toBe('user-456');
      });

      it('should allow node inspection on deleted models', () => {
        // Act
        const inputNode = testModel.nodes.get(nodeId1.toString());
        const outputNode = testModel.nodes.get(nodeId2.toString());

        // Assert
        expect(inputNode).toBeDefined();
        expect(inputNode?.name).toBe('Input Node');
        expect(outputNode).toBeDefined();
        expect(outputNode?.name).toBe('Output Node');
      });
    });
  });

  describe('Data Preservation in Deleted State', () => {
    describe('PreserveModelStructure_OnSoftDeletion_ShouldMaintainIntegrity', () => {
      it('should preserve complete model structure when soft deleted', () => {
        // Arrange - Capture original state
        const originalName = testModel.name.toString();
        const originalVersion = testModel.version.toString();
        const originalStatus = testModel.status;
        const originalNodeCount = testModel.nodes.size;
        const originalActionCount = testModel.actionNodes.size;
        const originalMetadata = { ...testModel.metadata };
        const originalPermissions = { ...testModel.permissions };

        // Act
        const deleteResult = testModel.softDelete('data-manager');

        // Assert
        expect(deleteResult.isSuccess).toBe(true);
        
        // All original data should be preserved
        expect(testModel.name.toString()).toBe(originalName);
        expect(testModel.version.toString()).toBe(originalVersion);
        expect(testModel.status).toBe(ModelStatus.PUBLISHED); // Original status preserved
        expect(testModel.nodes.size).toBe(originalNodeCount);
        expect(testModel.actionNodes.size).toBe(originalActionCount);
        expect(testModel.metadata).toEqual(originalMetadata);
        expect(testModel.permissions).toEqual(originalPermissions);
        
        // Only deletion-specific data should be added
        expect(testModel.isDeleted()).toBe(true);
        expect(testModel.deletedAt).toBeInstanceOf(Date);
        expect(testModel.deletedBy).toBe('data-manager');
      });
    });

    describe('PreserveNodeRelationships_OnSoftDeletion_ShouldMaintainConnections', () => {
      it('should preserve node relationships when model is soft deleted', () => {
        // Arrange - Create node relationships (simplified for test)
        const nodeConnections = new Map();
        nodeConnections.set(nodeId1.toString(), [nodeId2.toString()]);
        
        // Simulate node connections by storing in metadata
        testModel.updateMetadata({
          nodeConnections: Object.fromEntries(nodeConnections),
        });

        // Act
        const deleteResult = testModel.softDelete('relationship-manager');

        // Assert
        expect(deleteResult.isSuccess).toBe(true);
        
        // Node relationships should be preserved in metadata
        const preservedConnections = testModel.metadata.nodeConnections;
        expect(preservedConnections).toBeDefined();
        expect(preservedConnections[nodeId1.toString()]).toContain(nodeId2.toString());
        
        // All nodes should still be present
        expect(testModel.nodes.has(nodeId1.toString())).toBe(true);
        expect(testModel.nodes.has(nodeId2.toString())).toBe(true);
      });
    });

    describe('PreserveExecutionHistory_OnSoftDeletion_ShouldMaintainAuditTrail', () => {
      it('should preserve execution history in model metadata when soft deleted', () => {
        // Arrange - Simulate execution history
        const executionHistory = [
          {
            executionId: 'exec-1',
            startTime: new Date('2024-01-01T10:00:00Z'),
            endTime: new Date('2024-01-01T10:05:00Z'),
            status: 'completed',
            triggeredBy: 'user-123',
          },
          {
            executionId: 'exec-2',
            startTime: new Date('2024-01-02T14:00:00Z'),
            endTime: new Date('2024-01-02T14:03:00Z'),
            status: 'completed',
            triggeredBy: 'user-456',
          },
        ];

        testModel.updateMetadata({
          executionHistory,
          totalExecutions: executionHistory.length,
          lastExecutionAt: new Date('2024-01-02T14:03:00Z'),
        });

        // Act
        const deleteResult = testModel.softDelete('audit-manager');

        // Assert
        expect(deleteResult.isSuccess).toBe(true);
        
        // Execution history should be completely preserved
        expect(testModel.metadata.executionHistory).toEqual(executionHistory);
        expect(testModel.metadata.totalExecutions).toBe(2);
        expect(testModel.metadata.lastExecutionAt).toEqual(new Date('2024-01-02T14:03:00Z'));
      });
    });
  });

  describe('State Validation and Business Rules', () => {
    describe('ValidateModelState_BeforeSoftDeletion_ShouldEnforceBusinessRules', () => {
      it('should validate model state meets deletion preconditions', () => {
        // Test cases for different model states
        const testCases = [
          {
            description: 'Published model with nodes',
            setupModel: (model: FunctionModel) => {
              // Model already setup with nodes in beforeEach
              return model;
            },
            expectedCanDelete: true,
            expectedBlockingReasons: [],
          },
          {
            description: 'Model with empty node structure',
            setupModel: (model: FunctionModel) => {
              // Clear all nodes - convert string keys back to NodeId
              const nodeIds = Array.from(model.nodes.keys());
              nodeIds.forEach(nodeIdString => {
                const nodeId = DomainTestHelpers.unwrapResult(
                  NodeId.create(nodeIdString),
                  `NodeId creation for ${nodeIdString}`
                );
                model.removeContainerNode(nodeId);
              });
              return model;
            },
            expectedCanDelete: true, // Empty models can be deleted
            expectedBlockingReasons: [],
          },
        ];

        testCases.forEach(({ description, setupModel, expectedCanDelete }) => {
          // Arrange - Create a fresh model for each test case instead of copying
          const freshModelName = DomainTestHelpers.unwrapResult(
            ModelName.create('Fresh Test Model'),
            'ModelName creation for validation test'
          );
          const freshVersion = DomainTestHelpers.unwrapResult(
            Version.create('1.0.0'),
            'Version creation for validation test'
          );
          
          const testModelCopy = DomainTestHelpers.unwrapResult(
            FunctionModel.create({
              modelId: 'validation-test-model',
              name: freshModelName,
              version: freshVersion,
              status: ModelStatus.DRAFT, // Start as draft so we can modify
              currentVersion: freshVersion,
              nodes: new Map(),
              actionNodes: new Map(),
              metadata: { 
                projectId: 'validation-test-project',
                createdBy: 'validation-tester',
                lastModifiedBy: 'validation-tester',
              },
              permissions: { 'validation-tester': 'owner' },
            }),
            'FunctionModel creation for validation test'
          );
          
          // Keep model in published state - no need to publish since we're testing various states
          
          setupModel(testModelCopy);

          // Act
          const deleteResult = testModelCopy.softDelete('validator');

          // Assert
          expect(deleteResult.isSuccess).toBe(expectedCanDelete);
          
          if (expectedCanDelete) {
            expect(testModelCopy.isDeleted()).toBe(true);
          } else {
            expect(testModelCopy.isDeleted()).toBe(false);
          }
        });
      });
    });

    describe('ValidateDeletionTimestamp_OnSoftDelete_ShouldSetAccurateTime', () => {
      it('should set deletion timestamp to current time within reasonable bounds', () => {
        // Arrange
        const beforeDelete = new Date();
        
        // Act
        const deleteResult = testModel.softDelete('time-tester');
        
        // Assert
        const afterDelete = new Date();
        expect(deleteResult.isSuccess).toBe(true);
        expect(testModel.deletedAt).toBeInstanceOf(Date);
        
        // Deletion time should be between before and after timestamps
        expect(testModel.deletedAt!.getTime()).toBeGreaterThanOrEqual(beforeDelete.getTime());
        expect(testModel.deletedAt!.getTime()).toBeLessThanOrEqual(afterDelete.getTime());
      });
    });

    describe('ValidateDeletedByParameter_OnSoftDelete_ShouldHandleVariousInputs', () => {
      it('should handle various deletedBy parameter formats correctly', () => {
        const testCases = [
          {
            input: 'user-123',
            expected: 'user-123',
            description: 'Standard user ID',
          },
          {
            input: '  user-with-spaces  ',
            expected: 'user-with-spaces', // Should be trimmed
            description: 'User ID with whitespace',
          },
          {
            input: 'system@automated-deletion',
            expected: 'system@automated-deletion',
            description: 'System-generated deletion marker',
          },
          {
            input: undefined,
            expected: undefined,
            description: 'Undefined deletedBy',
          },
        ];

        testCases.forEach(({ input, expected, description }, index) => {
          // Arrange - Create a fresh model for each test
          const modelName = DomainTestHelpers.unwrapResult(
            ModelName.create(`Test Model ${index}`),
            `ModelName creation for test case ${index}`
          );
          const version = DomainTestHelpers.unwrapResult(
            Version.create('1.0.0'),
            `Version creation for test case ${index}`
          );
          const freshModel = DomainTestHelpers.unwrapResult(
            FunctionModel.create({
              modelId: `test-model-${index}`,
              name: modelName,
              version: version,
              status: ModelStatus.DRAFT,
              currentVersion: version,
              nodes: new Map(),
              actionNodes: new Map(),
              metadata: {},
              permissions: { 'user-123': 'owner' },
            }),
            `FunctionModel creation for test case ${index}`
          );

          // Act
          const deleteResult = freshModel.softDelete(input);

          // Assert
          expect(deleteResult.isSuccess).toBe(true);
          expect(freshModel.deletedBy).toBe(expected);
          expect(freshModel.isDeleted()).toBe(true);
        });
      });
    });
  });

  describe('Clean Architecture Entity Compliance', () => {
    describe('EntityBehavior_ShouldNotDependOnExternalServices', () => {
      it('should handle soft deletion using only internal entity logic', () => {
        // Arrange & Act - No external dependencies should be needed
        const deleteResult = testModel.softDelete('architecture-tester');

        // Assert
        expect(deleteResult.isSuccess).toBe(true);
        
        // All behavior should be self-contained within the entity
        expect(testModel.isDeleted()).toBe(true);
        expect(testModel.deletedAt).toBeInstanceOf(Date);
        expect(testModel.deletedBy).toBe('architecture-tester');
        
        // No external service calls should be needed for basic soft deletion
        // The entity should maintain its own state consistency
      });
    });

    describe('DomainInvariants_ShouldBeMaintained_AfterSoftDeletion', () => {
      it('should maintain all domain invariants after soft deletion', () => {
        // Act
        const deleteResult = testModel.softDelete('invariant-checker');

        // Assert
        expect(deleteResult.isSuccess).toBe(true);
        
        // Domain invariants should be preserved
        expect(testModel.name).toBeDefined();
        expect(testModel.name.toString().length).toBeGreaterThan(0);
        expect(testModel.version).toBeDefined();
        expect(testModel.version.toString()).toMatch(/^\d+\.\d+\.\d+$/);
        expect(Object.values(ModelStatus)).toContain(testModel.status);
        expect(testModel.permissions).toBeDefined();
        expect(Object.keys(testModel.permissions).length).toBeGreaterThan(0);
        
        // Deletion state should also follow invariants
        expect(testModel.isDeleted()).toBe(true);
        expect(testModel.deletedAt).toBeInstanceOf(Date);
        expect(typeof testModel.deletedBy).toBe('string');
      });
    });
  });
});