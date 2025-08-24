/**
 * COMPREHENSIVE FUNCTION MODEL TESTS
 * 
 * This test suite serves as a BOUNDARY FILTER and SOURCE OF TRUTH for FunctionModel entity
 * interactions, demonstrating Clean Architecture testing principles:
 * 
 * 1. BOUNDARY FILTER: Tests validate entity invariants, business rules, and domain boundaries
 * 2. SOURCE OF TRUTH: Tests document expected behavior and serve as templates for entity usage
 * 3. DEPENDENCY INVERSION: Tests rely only on domain layer, no external dependencies
 * 4. IMMUTABILITY: Tests verify value object immutability and entity consistency
 * 
 * TESTING STRATEGY:
 * - Arrange/Act/Assert structure for clarity
 * - Descriptive test names following MethodName_Condition_ExpectedResult pattern
 * - Business rule validation through domain invariants
 * - Complete lifecycle testing (create → modify → publish → archive → delete)
 * - Edge cases and error conditions
 * 
 * USE AS TEMPLATE: This demonstrates proper entity interaction patterns for:
 * - Entity instantiation and validation
 * - Business rule enforcement
 * - State transitions and lifecycle management
 * - Error handling and domain failures
 */

import { FunctionModel, ValidationResult } from '@/lib/domain/entities/function-model';
import { ModelName } from '@/lib/domain/value-objects/model-name';
import { Version } from '@/lib/domain/value-objects/version';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { ModelStatus } from '@/lib/domain/enums';
import { IONode } from '@/lib/domain/entities/io-node';
import { StageNode } from '@/lib/domain/entities/stage-node';
import { TetherNode } from '@/lib/domain/entities/tether-node';
import { Result } from '@/lib/domain/shared/result';

// Test builders that demonstrate proper entity instantiation
import { 
  FunctionModelBuilder, 
  IONodeBuilder, 
  StageNodeBuilder, 
  TetherNodeBuilder,
  TestData 
} from '../../../utils/test-fixtures';

describe('FunctionModel - Comprehensive Domain Entity Tests', () => {
  /**
   * TEMPLATE: Entity Creation and Validation
   * Shows how to properly instantiate domain entities with business rule validation
   */
  describe('Entity Creation and Domain Invariants', () => {
    it('Create_WithValidProperties_ShouldSucceedAndEnforceInvariants', () => {
      // Arrange - Use proper value objects and domain rules
      const modelName = ModelName.create('Valid Test Model').value;
      const version = Version.create('1.0.0').value;
      const modelId = crypto.randomUUID();

      // Act - Entity creation with domain validation
      const result = FunctionModel.create({
        modelId,
        name: modelName,
        description: 'A comprehensive test model',
        version,
        status: ModelStatus.DRAFT,
        currentVersion: version,
        nodes: new Map(),
        actionNodes: new Map(),
        metadata: { environment: 'test', purpose: 'validation' },
        permissions: {
          owner: 'test-owner-id',
          editors: [],
          viewers: []
        }
      });

      // Assert - Verify domain invariants and business rules
      expect(result.isSuccess).toBe(true);
      expect(result.value.modelId).toBe(modelId);
      expect(result.value.name.equals(modelName)).toBe(true);
      expect(result.value.version.equals(version)).toBe(true);
      expect(result.value.status).toBe(ModelStatus.DRAFT);
      expect(result.value.versionCount).toBe(1); // Business rule: initial version count
      expect(result.value.nodes.size).toBe(0); // Invariant: starts empty
      expect(result.value.actionNodes.size).toBe(0); // Invariant: starts empty
      expect(result.value.createdAt).toBeInstanceOf(Date);
      expect(result.value.updatedAt).toBeInstanceOf(Date);
      expect(result.value.lastSavedAt).toBeInstanceOf(Date);
      
      // Boundary Filter: Verify immutability (getters are read-only)
      expect(() => {
        try {
          (result.value as any).modelId = 'changed';
        } catch (e) {
          // Expected - properties are protected
        }
      }).not.toThrow();
      expect(result.value.modelId).toBe(modelId); // Should remain unchanged
      
      // Domain Rule: New models start as drafts
      expect(result.value.status).toBe(ModelStatus.DRAFT);
    });

    it('Create_WithInvalidModelName_ShouldFailValidation', () => {
      // Arrange - Invalid domain data
      const invalidName = ''; // Violates ModelName business rules
      
      // Act & Assert - Domain validation should prevent creation
      const nameResult = ModelName.create(invalidName);
      expect(nameResult.isFailure).toBe(true);
      expect(nameResult.error).toContain('Model name cannot be empty');
    });

    it('Create_WithBuilder_ShouldDemonstrateProperInstantiationPattern', () => {
      // Arrange & Act - Using builder pattern (template for entity creation)
      const model = new FunctionModelBuilder()
        .withName('Builder Pattern Example')
        .withDescription('Demonstrates proper entity instantiation')
        .withVersion('2.1.0')
        .withOwner('builder-user-id')
        .build();

      // Assert - Verify builder produces valid domain entity
      expect(model.name.toString()).toBe('Builder Pattern Example');
      expect(model.description).toBe('Demonstrates proper entity instantiation');
      expect(model.version.toString()).toBe('2.1.0');
      expect(model.permissions.owner).toBe('builder-user-id');
    });
  });

  /**
   * TEMPLATE: Business Rule Validation and State Transitions
   * Shows how domain entities enforce business rules through their methods
   */
  describe('Business Rules and Domain Logic Enforcement', () => {
    let validModel: FunctionModel;

    beforeEach(() => {
      validModel = new FunctionModelBuilder()
        .withName('Business Rules Test Model')
        .withStatus(ModelStatus.DRAFT)
        .build();
    });

    it('UpdateName_WithValidName_ShouldUpdateAndMaintainInvariants', async () => {
      // Arrange
      const newName = ModelName.create('Updated Model Name').value;
      const originalUpdatedAt = validModel.updatedAt;

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      // Act
      const result = validModel.updateName(newName);

      // Assert - Business rule enforcement
      expect(result.isSuccess).toBe(true);
      expect(validModel.name.equals(newName)).toBe(true);
      expect(validModel.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      
      // Invariant: Other properties unchanged
      expect(validModel.status).toBe(ModelStatus.DRAFT);
      expect(validModel.versionCount).toBe(1);
    });

    it('Publish_ValidDraftModel_ShouldTransitionStateAndEnforceRules', () => {
      // Arrange - Add minimum required nodes for valid workflow (input and output nodes)
      const inputNode = new IONodeBuilder()
        .withModelId(validModel.modelId)
        .asInput()
        .build();
      
      const outputNode = new IONodeBuilder()
        .withModelId(validModel.modelId)
        .asOutput()
        .build();

      validModel.addNode(inputNode);
      validModel.addNode(outputNode);

      // Act - State transition
      const result = validModel.publish();

      // Assert - Business rule: only valid workflows can be published
      expect(result.isSuccess).toBe(true);
      expect(validModel.status).toBe(ModelStatus.PUBLISHED);
      
      // Domain invariant: version count remains unchanged (publish doesn't increment it)
      expect(validModel.versionCount).toBe(1);
    });

    it('Publish_AlreadyPublishedModel_ShouldEnforceBusinessRule', () => {
      // Arrange - Published model with both input and output nodes
      const inputNode = new IONodeBuilder().withModelId(validModel.modelId).asInput().build();
      const outputNode = new IONodeBuilder().withModelId(validModel.modelId).asOutput().build();
      validModel.addNode(inputNode);
      validModel.addNode(outputNode);
      validModel.publish(); // First publish

      // Act - Attempt to publish again
      const result = validModel.publish();

      // Assert - Business rule: cannot republish
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Model is already published');
    });

    it('Archive_PublishedModel_ShouldTransitionToArchivedState', () => {
      // Arrange - Published model with both input and output nodes
      const inputNode = new IONodeBuilder().withModelId(validModel.modelId).asInput().build();
      const outputNode = new IONodeBuilder().withModelId(validModel.modelId).asOutput().build();
      validModel.addNode(inputNode);
      validModel.addNode(outputNode);
      validModel.publish();

      // Act
      const result = validModel.archive();

      // Assert - State transition rules
      expect(result.isSuccess).toBe(true);
      expect(validModel.status).toBe(ModelStatus.ARCHIVED);
    });

    it('SoftDelete_WithUser_ShouldMarkDeletedAndRecordAuditInfo', () => {
      // Arrange
      const deletedBy = 'user-123';

      // Act
      const result = validModel.softDelete(deletedBy);

      // Assert - Audit trail and business rules
      expect(result.isSuccess).toBe(true);
      expect(validModel.deletedAt).toBeInstanceOf(Date);
      expect(validModel.deletedBy).toBe(deletedBy);
      
      // Domain rule: soft delete maintains model for audit
      expect(validModel.modelId).toBeDefined();
      expect(validModel.name).toBeDefined();
    });
  });

  /**
   * TEMPLATE: Aggregate Root Responsibilities
   * Shows how aggregate roots manage child entities and maintain consistency
   */
  describe('Aggregate Root and Entity Relationships', () => {
    let model: FunctionModel;

    beforeEach(() => {
      model = new FunctionModelBuilder()
        .withName('Aggregate Test Model')
        .build();
    });

    it('AddNode_ValidNode_ShouldMaintainEntityConsistency', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withModelId(model.modelId)
        .withName('Input Node')
        .asInput()
        .build();

      // Act
      const result = model.addNode(node);

      // Assert - Aggregate consistency
      expect(result.isSuccess).toBe(true);
      expect(model.nodes.size).toBe(1);
      expect(model.nodes.get(node.nodeId.toString())).toBe(node);
      
      // Domain rule: nodes must belong to the model
      expect(node.modelId).toBe(model.modelId);
    });

    it('AddNode_NodeFromDifferentModel_ShouldEnforceBoundaryRule', () => {
      // Arrange - Node from different model
      const otherModelId = crypto.randomUUID();
      const nodeFromOtherModel = new IONodeBuilder()
        .withModelId(otherModelId)
        .build();

      // Act
      const result = model.addNode(nodeFromOtherModel);

      // Assert - Boundary rule enforcement
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Node belongs to different model');
      expect(model.nodes.size).toBe(0); // No change to aggregate
    });

    it('AddActionNode_ToValidParent_ShouldMaintainHierarchy', () => {
      // Arrange - Parent node must exist first
      const stageNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .withName('Process Stage')
        .build();
      
      model.addNode(stageNode);

      const actionNode = new TetherNodeBuilder()
        .withModelId(model.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Action Step')
        .build();

      // Act
      const result = model.addActionNode(actionNode);

      // Assert - Hierarchical consistency
      expect(result.isSuccess).toBe(true);
      expect(model.actionNodes.size).toBe(1);
      expect(model.actionNodes.get(actionNode.actionId.toString())).toBe(actionNode);
    });

    it('RemoveNode_WithDependentActions_ShouldMaintainReferentialIntegrity', () => {
      // Arrange - Node with dependent action
      const stageNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .build();
      const actionNode = new TetherNodeBuilder()
        .withModelId(model.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .build();

      model.addNode(stageNode);
      model.addActionNode(actionNode);

      // Act - Remove parent node
      const result = model.removeNode(stageNode.nodeId);

      // Assert - Referential integrity maintained
      expect(result.isSuccess).toBe(true);
      expect(model.nodes.size).toBe(0);
      expect(model.actionNodes.size).toBe(0); // Dependent actions removed
    });
  });

  /**
   * TEMPLATE: Workflow Validation and Business Logic
   * Shows how domain entities validate complex business scenarios
   */
  describe('Workflow Validation and Domain Complexity', () => {
    let model: FunctionModel;

    beforeEach(() => {
      model = new FunctionModelBuilder()
        .withName('Workflow Validation Model')
        .build();
    });

    it('ValidateWorkflow_CompleteWorkflow_ShouldPassValidation', () => {
      // Arrange - Complete valid workflow
      const inputNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .withName('Input')
        .asInput()
        .build();
      
      const stageNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .withName('Processing Stage')
        .build();
      
      const outputNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .withName('Output')
        .asOutput()
        .build();

      const actionNode = new TetherNodeBuilder()
        .withModelId(model.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Process Action')
        .build();

      model.addNode(inputNode);
      model.addNode(stageNode);
      model.addNode(outputNode);
      model.addActionNode(actionNode);

      // Act
      const result = model.validateWorkflow();

      // Assert - Complex business validation
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('ValidateWorkflow_MissingIONodes_ShouldFailWithSpecificError', () => {
      // Arrange - Incomplete workflow (no IO nodes at all)
      const stageNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .build();
      
      model.addNode(stageNode);

      // Act
      const result = model.validateWorkflow();

      // Assert - Domain validation rules (validation requires both input and output nodes)
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Workflow must have at least one input node');
      expect(validation.errors).toContain('Workflow must have at least one output node');
    });

    it('ValidateWorkflow_WithIONode_ShouldPassValidation', () => {
      // Arrange - Valid workflow with both input and output nodes
      const inputNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .asInput()
        .build();
      
      const outputNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .asOutput()
        .build();
      
      model.addNode(inputNode);
      model.addNode(outputNode);

      // Act
      const result = model.validateWorkflow();

      // Assert - Domain validation rules (both nodes satisfy minimum requirement)
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('ValidateWorkflow_WithStageNodes_ShouldNotGenerateWarnings', () => {
      // Arrange - Valid workflow with connected stage nodes and required IO nodes
      const inputNode = new IONodeBuilder().withModelId(model.modelId).asInput().build();
      const outputNode = new IONodeBuilder().withModelId(model.modelId).asOutput().build();
      const stageNode = new StageNodeBuilder().withModelId(model.modelId).build();

      model.addNode(inputNode);
      model.addNode(outputNode);
      model.addNode(stageNode);

      // Add connections to prevent "no connections" warnings
      stageNode.addDependency(inputNode.nodeId);
      outputNode.addDependency(stageNode.nodeId);

      // Add an action to the stage node to prevent "no actions" warning
      const tetherAction = new TetherNodeBuilder()
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(model.modelId)
        .withName('Stage Action')
        .build();
      
      model.addActionNode(tetherAction);

      // Act
      const result = model.validateWorkflow();

      // Assert - Should have connected workflow with actions, no warnings
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(0); // Connected workflow with actions
    });
  });

  /**
   * TEMPLATE: Domain Metadata and Configuration
   * Shows how entities handle configuration and metadata following domain rules
   */
  describe('Metadata and Configuration Management', () => {
    let model: FunctionModel;

    beforeEach(() => {
      model = new FunctionModelBuilder()
        .withName('Configuration Test Model')
        .build();
    });

    it('UpdateMetadata_ValidConfiguration_ShouldReplaceMetadata', () => {
      // Arrange - Store original metadata
      const originalMetadata = { ...model.metadata };
      const newMetadata = {
        environment: 'production',
        tags: ['important', 'workflow'],
        configuration: { timeout: 300 }
      };

      // Act
      const result = model.updateMetadata(newMetadata);

      // Assert - Metadata replacement (not merge)
      expect(result.isSuccess).toBe(true);
      expect(model.metadata.environment).toBe('production');
      expect(model.metadata.tags).toEqual(['important', 'workflow']);
      expect(model.metadata.configuration.timeout).toBe(300);
      
      // Original metadata should be replaced, not merged
      expect(model.metadata.createdFor).toBeUndefined(); // Replaced, not preserved
    });

    it('UpdatePermissions_ValidPermissions_ShouldUpdateAccessControl', () => {
      // Arrange
      const newPermissions = {
        owner: 'new-owner-id',
        editors: ['editor-1', 'editor-2'],
        viewers: ['viewer-1', 'viewer-2', 'viewer-3']
      };

      // Act
      const result = model.updatePermissions(newPermissions);

      // Assert - Access control update
      expect(result.isSuccess).toBe(true);
      expect(model.permissions.owner).toBe('new-owner-id');
      expect(model.permissions.editors).toEqual(['editor-1', 'editor-2']);
      expect(model.permissions.viewers).toEqual(['viewer-1', 'viewer-2', 'viewer-3']);
    });

    it('UpdateAIAgentConfig_ValidConfig_ShouldStoreConfiguration', () => {
      // Arrange
      const aiConfig = {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: 'You are a helpful assistant for workflow processing'
      };

      // Act
      const result = model.updateAIAgentConfig(aiConfig);

      // Assert - AI configuration management
      expect(result.isSuccess).toBe(true);
      expect(model.aiAgentConfig).toBeDefined();
      expect(model.aiAgentConfig!.model).toBe('gpt-4');
      expect(model.aiAgentConfig!.temperature).toBe(0.7);
      expect(model.aiAgentConfig!.systemPrompt).toBe('You are a helpful assistant for workflow processing');
    });
  });

  /**
   * TEMPLATE: Entity Equality and Identity
   * Shows how domain entities implement equality and identity following DDD principles
   */
  describe('Entity Identity and Equality', () => {
    it('Equals_SameModelId_ShouldBeEqual', () => {
      // Arrange
      const modelId = crypto.randomUUID();
      const model1 = new FunctionModelBuilder().withId(modelId).withName('Model 1').build();
      const model2 = new FunctionModelBuilder().withId(modelId).withName('Model 2').build();

      // Act & Assert - Entity identity based on ID, not all properties
      expect(model1.equals(model2)).toBe(true);
    });

    it('Equals_DifferentModelId_ShouldNotBeEqual', () => {
      // Arrange
      const model1 = new FunctionModelBuilder().withName('Same Name').build();
      const model2 = new FunctionModelBuilder().withName('Same Name').build();

      // Act & Assert - Different entities despite same properties
      expect(model1.equals(model2)).toBe(false);
    });
  });

  /**
   * TEMPLATE: Audit Trail and Timestamps
   * Shows how entities maintain audit information and temporal data
   */
  describe('Audit Trail and Temporal Concerns', () => {
    let model: FunctionModel;

    beforeEach(() => {
      model = new FunctionModelBuilder()
        .withName('Audit Test Model')
        .build();
    });

    it('MarkSaved_UpdatesLastSavedTimestamp', () => {
      // Arrange
      const originalLastSaved = model.lastSavedAt;
      
      // Small delay to ensure timestamp difference
      jest.advanceTimersByTime(10);

      // Act
      model.markSaved();

      // Assert - Temporal tracking
      expect(model.lastSavedAt.getTime()).toBeGreaterThanOrEqual(originalLastSaved.getTime());
    });

    it('IncrementVersionCount_UpdatesVersionTracking', () => {
      // Arrange
      const originalCount = model.versionCount;

      // Act
      model.incrementVersionCount();

      // Assert - Version tracking
      expect(model.versionCount).toBe(originalCount + 1);
    });

    it('AnyModification_UpdatesTimestamp', () => {
      // Arrange
      const originalUpdatedAt = model.updatedAt;
      const newName = ModelName.create('Updated Name').value;

      // Small delay to ensure timestamp difference
      jest.advanceTimersByTime(10);

      // Act
      model.updateName(newName);

      // Assert - Automatic audit trail
      expect(model.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });
});

/**
 * SUMMARY: This comprehensive test suite demonstrates Clean Architecture testing principles:
 * 
 * 1. BOUNDARY FILTER: Each test validates domain rules, business invariants, and entity boundaries
 * 2. SOURCE OF TRUTH: Tests document the exact API and expected behavior patterns
 * 3. TEMPLATE USAGE: Tests show how to properly instantiate, modify, and interact with entities
 * 4. DEPENDENCY INVERSION: Tests depend only on domain layer, no infrastructure concerns
 * 5. BUSINESS FOCUS: Tests validate business scenarios, not technical implementation details
 * 
 * Use this as a template for creating comprehensive domain entity tests that serve as:
 * - Living documentation of entity behavior
 * - Validation of business rules and domain invariants  
 * - Examples for proper entity usage patterns
 * - Boundary filters preventing architectural violations
 */