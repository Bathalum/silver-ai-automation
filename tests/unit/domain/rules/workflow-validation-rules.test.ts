/**
 * Unit tests for WorkflowValidationRules
 * Tests business rule validation for workflow structures and dependencies
 */

import { WorkflowValidationRules } from '@/lib/domain/rules/workflow-validation';
import { Node } from '@/lib/domain/entities/node';
import { 
  FunctionModelBuilder,
  IONodeBuilder, 
  StageNodeBuilder,
  TestFactories 
} from '../../../utils/test-fixtures';
import { ResultTestHelpers } from '../../../utils/test-helpers';

describe('WorkflowValidationRules', () => {
  let validationRules: WorkflowValidationRules;

  beforeEach(() => {
    validationRules = new WorkflowValidationRules();
  });

  describe('validateNodeConnections', () => {
    it('should validate properly connected nodes', () => {
      // Arrange
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder()
        .withModelId(modelId)
        .withName('Input')
        .asInput()
        .build();
      
      const stageNode = new StageNodeBuilder()
        .withModelId(modelId)
        .withName('Process')
        .build();
      
      const outputNode = new IONodeBuilder()
        .withModelId(modelId)
        .withName('Output')
        .asOutput()
        .build();

      // Connect them: Input -> Stage -> Output
      stageNode.addDependency(inputNode.nodeId.toString());
      outputNode.addDependency(stageNode.nodeId.toString());
      
      const nodes = [inputNode, stageNode, outputNode];
      
      // Act
      const result = validationRules.validateNodeConnections(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors).toHaveLength(0);
    });

    it('should detect unconnected nodes', () => {
      // Arrange
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder()
        .withModelId(modelId)
        .withName('Input')
        .asInput()
        .build();
      
      const isolatedNode = new StageNodeBuilder()
        .withModelId(modelId)
        .withName('Isolated')
        .build();
      
      const outputNode = new IONodeBuilder()
        .withModelId(modelId)
        .withName('Output')
        .asOutput()
        .build();

      // No connections between nodes
      const nodes = [inputNode, isolatedNode, outputNode];
      
      // Act
      const result = validationRules.validateNodeConnections(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.warnings).toContain('Node "Isolated" has no connections');
    });

    it('should detect invalid dependency references', () => {
      // Arrange
      const modelId = 'test-model';
      const stageNode = new StageNodeBuilder()
        .withModelId(modelId)
        .withName('Stage')
        .build();

      // Add dependency to non-existent node
      stageNode.addDependency('non-existent-node-id');
      
      const nodes = [stageNode];
      
      // Act
      const result = validationRules.validateNodeConnections(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Node "Stage" references non-existent dependency: non-existent-node-id');
    });

    it('should validate complex connection patterns', () => {
      // Arrange - Create a diamond pattern: Input -> A,B -> Output
      const modelId = 'test-model';
      
      const inputNode = new IONodeBuilder()
        .withId('input')
        .withModelId(modelId)
        .withName('Input')
        .asInput()
        .build();
      
      const stageA = new StageNodeBuilder()
        .withId('stage-a')
        .withModelId(modelId)
        .withName('Stage A')
        .build();
      
      const stageB = new StageNodeBuilder()
        .withId('stage-b')
        .withModelId(modelId)
        .withName('Stage B')
        .build();
      
      const outputNode = new IONodeBuilder()
        .withId('output')
        .withModelId(modelId)
        .withName('Output')
        .asOutput()
        .build();

      // Create diamond pattern
      stageA.addDependency('input');
      stageB.addDependency('input');
      outputNode.addDependency('stage-a');
      outputNode.addDependency('stage-b');
      
      const nodes = [inputNode, stageA, stageB, outputNode];
      
      // Act
      const result = validationRules.validateNodeConnections(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
    });
  });

  describe('validateExecutionFlow', () => {
    it('should validate proper input-output flow', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const nodes = Array.from(model.nodes.values());
      
      // Act
      const result = validationRules.validateExecutionFlow(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
    });

    it('should require at least one input node', () => {
      // Arrange - Create workflow without input
      const modelId = 'test-model';
      const stageNode = new StageNodeBuilder()
        .withModelId(modelId)
        .build();
      
      const outputNode = new IONodeBuilder()
        .withModelId(modelId)
        .asOutput()
        .build();

      const nodes = [stageNode, outputNode];
      
      // Act
      const result = validationRules.validateExecutionFlow(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Workflow must have at least one input node');
    });

    it('should require at least one output node', () => {
      // Arrange - Create workflow without output
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder()
        .withModelId(modelId)
        .asInput()
        .build();
      
      const stageNode = new StageNodeBuilder()
        .withModelId(modelId)
        .build();

      const nodes = [inputNode, stageNode];
      
      // Act
      const result = validationRules.validateExecutionFlow(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Workflow must have at least one output node');
    });

    it('should detect unreachable output nodes', () => {
      // Arrange
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder()
        .withId('input')
        .withModelId(modelId)
        .asInput()
        .build();
      
      const connectedOutput = new IONodeBuilder()
        .withId('connected-output')
        .withModelId(modelId)
        .asOutput()
        .build();
      
      const unreachableOutput = new IONodeBuilder()
        .withId('unreachable-output')
        .withModelId(modelId)
        .asOutput()
        .build();

      // Only connect one output
      connectedOutput.addDependency('input');
      // unreachableOutput has no dependencies
      
      const nodes = [inputNode, connectedOutput, unreachableOutput];
      
      // Act
      const result = validationRules.validateExecutionFlow(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Output node "unreachable-output" is not reachable from any input');
    });
  });

  describe('validateCircularDependencies', () => {
    it('should pass validation with no circular dependencies', () => {
      // Arrange - Linear chain: A -> B -> C
      const modelId = 'test-model';
      
      const nodeA = new StageNodeBuilder()
        .withId('node-a')
        .withModelId(modelId)
        .withName('Node A')
        .build();
      
      const nodeB = new StageNodeBuilder()
        .withId('node-b')
        .withModelId(modelId)
        .withName('Node B')
        .build();
      
      const nodeC = new StageNodeBuilder()
        .withId('node-c')
        .withModelId(modelId)
        .withName('Node C')
        .build();

      nodeB.addDependency('node-a');
      nodeC.addDependency('node-b');
      
      const nodes = [nodeA, nodeB, nodeC];
      
      // Act
      const result = validationRules.validateCircularDependencies(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors).toHaveLength(0);
    });

    it('should detect simple circular dependency', () => {
      // Arrange - Simple cycle: A -> B -> A
      const modelId = 'test-model';
      
      const nodeA = new StageNodeBuilder()
        .withId('node-a')
        .withModelId(modelId)
        .withName('Node A')
        .build();
      
      const nodeB = new StageNodeBuilder()
        .withId('node-b')
        .withModelId(modelId)
        .withName('Node B')
        .build();

      nodeA.addDependency('node-b');
      nodeB.addDependency('node-a');
      
      const nodes = [nodeA, nodeB];
      
      // Act
      const result = validationRules.validateCircularDependencies(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Circular dependency detected in nodes: node-a -> node-b -> node-a');
    });

    it('should detect complex circular dependency', () => {
      // Arrange - Complex cycle: A -> B -> C -> A
      const modelId = 'test-model';
      
      const nodeA = new StageNodeBuilder()
        .withId('node-a')
        .withModelId(modelId)
        .build();
      
      const nodeB = new StageNodeBuilder()
        .withId('node-b')
        .withModelId(modelId)
        .build();
      
      const nodeC = new StageNodeBuilder()
        .withId('node-c')
        .withModelId(modelId)
        .build();

      nodeA.addDependency('node-c');
      nodeB.addDependency('node-a');
      nodeC.addDependency('node-b');
      
      const nodes = [nodeA, nodeB, nodeC];
      
      // Act
      const result = validationRules.validateCircularDependencies(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors.some(error => 
        error.includes('Circular dependency detected')
      )).toBe(true);
    });

    it('should detect self-referencing node', () => {
      // Arrange - Node that depends on itself
      const modelId = 'test-model';
      
      const selfReferencingNode = new StageNodeBuilder()
        .withId('self-ref')
        .withModelId(modelId)
        .withName('Self Referencing')
        .build();

      selfReferencingNode.addDependency('self-ref');
      
      const nodes = [selfReferencingNode];
      
      // Act
      const result = validationRules.validateCircularDependencies(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Node "Self Referencing" has self-referencing dependency');
    });

    it('should handle multiple independent cycles', () => {
      // Arrange - Two separate cycles: A->B->A and C->D->C
      const modelId = 'test-model';
      
      const nodeA = new StageNodeBuilder()
        .withId('node-a')
        .withModelId(modelId)
        .build();
      
      const nodeB = new StageNodeBuilder()
        .withId('node-b')
        .withModelId(modelId)
        .build();
      
      const nodeC = new StageNodeBuilder()
        .withId('node-c')
        .withModelId(modelId)
        .build();
      
      const nodeD = new StageNodeBuilder()
        .withId('node-d')
        .withModelId(modelId)
        .build();

      // First cycle: A -> B -> A
      nodeA.addDependency('node-b');
      nodeB.addDependency('node-a');
      
      // Second cycle: C -> D -> C  
      nodeC.addDependency('node-d');
      nodeD.addDependency('node-c');
      
      const nodes = [nodeA, nodeB, nodeC, nodeD];
      
      // Act
      const result = validationRules.validateCircularDependencies(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors.length).toBeGreaterThanOrEqual(2); // Should detect both cycles
    });
  });

  describe('validateRequiredNodes', () => {
    it('should validate workflow with required node types', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const nodes = Array.from(model.nodes.values());
      
      // Act
      const result = validationRules.validateRequiredNodes(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
    });

    it('should require minimum number of nodes', () => {
      // Arrange - Empty workflow
      const nodes: ContainerNode[] = [];
      
      // Act
      const result = validationRules.validateRequiredNodes(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Workflow must have at least 2 nodes');
    });

    it('should warn about workflows with only IO nodes', () => {
      // Arrange - Only input and output, no processing
      const modelId = 'test-model';
      
      const inputNode = new IONodeBuilder()
        .withModelId(modelId)
        .asInput()
        .build();
      
      const outputNode = new IONodeBuilder()
        .withModelId(modelId)
        .asOutput()
        .build();

      const nodes = [inputNode, outputNode];
      
      // Act
      const result = validationRules.validateRequiredNodes(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Workflow has no processing nodes - consider adding Stage nodes');
    });

    it('should warn about too many nodes for performance', () => {
      // Arrange - Create a workflow with many nodes
      const modelId = 'test-model';
      const nodes: ContainerNode[] = [];
      
      // Create 101 nodes (over the recommended limit)
      for (let i = 0; i < 101; i++) {
        const node = new StageNodeBuilder()
          .withId(`node-${i}`)
          .withModelId(modelId)
          .withName(`Node ${i}`)
          .build();
        nodes.push(node);
      }
      
      // Act
      const result = validationRules.validateRequiredNodes(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Workflow has more than 100 nodes - consider breaking into smaller workflows for better performance');
    });

    it('should validate node name uniqueness', () => {
      // Arrange - Nodes with duplicate names
      const modelId = 'test-model';
      
      const node1 = new StageNodeBuilder()
        .withId('node-1')
        .withModelId(modelId)
        .withName('Duplicate Name')
        .build();
      
      const node2 = new StageNodeBuilder()
        .withId('node-2')
        .withModelId(modelId)
        .withName('Duplicate Name') // Same name
        .build();

      const nodes = [node1, node2];
      
      // Act
      const result = validationRules.validateRequiredNodes(nodes);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Multiple nodes have the same name: "Duplicate Name"');
    });
  });

  describe('comprehensive workflow validation', () => {
    it('should validate complex valid workflow', () => {
      // Arrange - Complex but valid workflow
      const modelId = 'test-model';
      
      // Input layer
      const inputA = new IONodeBuilder()
        .withId('input-a')
        .withModelId(modelId)
        .withName('Input A')
        .asInput()
        .build();
      
      const inputB = new IONodeBuilder()
        .withId('input-b')
        .withModelId(modelId)
        .withName('Input B')
        .asInput()
        .build();
      
      // Processing layer
      const processA = new StageNodeBuilder()
        .withId('process-a')
        .withModelId(modelId)
        .withName('Process A')
        .build();
      
      const processB = new StageNodeBuilder()
        .withId('process-b')
        .withModelId(modelId)
        .withName('Process B')
        .build();
      
      const merge = new StageNodeBuilder()
        .withId('merge')
        .withModelId(modelId)
        .withName('Merge')
        .build();
      
      // Output layer
      const output = new IONodeBuilder()
        .withId('output')
        .withModelId(modelId)
        .withName('Output')
        .asOutput()
        .build();

      // Connect: InputA -> ProcessA -> Merge
      //          InputB -> ProcessB -> Merge -> Output
      processA.addDependency('input-a');
      processB.addDependency('input-b');
      merge.addDependency('process-a');
      merge.addDependency('process-b');
      output.addDependency('merge');
      
      const nodes = [inputA, inputB, processA, processB, merge, output];
      
      // Act - Run all validations
      const connectionResult = validationRules.validateNodeConnections(nodes);
      const flowResult = validationRules.validateExecutionFlow(nodes);
      const circularResult = validationRules.validateCircularDependencies(nodes);
      const requiredResult = validationRules.validateRequiredNodes(nodes);
      
      // Assert
      expect(connectionResult).toBeValidResult();
      expect(connectionResult.value.isValid).toBe(true);
      
      expect(flowResult).toBeValidResult();
      expect(flowResult.value.isValid).toBe(true);
      
      expect(circularResult).toBeValidResult();
      expect(circularResult.value.isValid).toBe(true);
      
      expect(requiredResult).toBeValidResult();
      expect(requiredResult.value.isValid).toBe(true);
    });

    it('should accumulate multiple validation errors', () => {
      // Arrange - Workflow with multiple issues
      const modelId = 'test-model';
      
      // Create problematic workflow:
      // - No input nodes
      // - Circular dependency
      // - Unreachable nodes
      
      const nodeA = new StageNodeBuilder()
        .withId('node-a')
        .withModelId(modelId)
        .withName('Node A')
        .build();
      
      const nodeB = new StageNodeBuilder()
        .withId('node-b')
        .withModelId(modelId)
        .withName('Node B')
        .build();
      
      const isolatedOutput = new IONodeBuilder()
        .withId('isolated-output')
        .withModelId(modelId)
        .withName('Isolated Output')
        .asOutput()
        .build();

      // Create circular dependency
      nodeA.addDependency('node-b');
      nodeB.addDependency('node-a');
      // isolatedOutput has no dependencies
      
      const nodes = [nodeA, nodeB, isolatedOutput];
      
      // Act
      const flowResult = validationRules.validateExecutionFlow(nodes);
      const circularResult = validationRules.validateCircularDependencies(nodes);
      
      // Assert
      expect(flowResult).toBeValidResult();
      expect(flowResult.value.isValid).toBe(false);
      expect(flowResult.value.errors).toContain('Workflow must have at least one input node');
      
      expect(circularResult).toBeValidResult();
      expect(circularResult.value.isValid).toBe(false);
      expect(circularResult.value.errors.some(e => e.includes('Circular dependency'))).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty node array gracefully', () => {
      // Act
      const result = validationRules.validateNodeConnections([]);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
    });

    it('should handle nodes with invalid data gracefully', () => {
      // Arrange - This tests the validation robustness
      const nodes = [null, undefined].filter(Boolean) as ContainerNode[];
      
      // Act & Assert - Should not throw
      expect(() => {
        validationRules.validateNodeConnections(nodes);
        validationRules.validateExecutionFlow(nodes);
        validationRules.validateCircularDependencies(nodes);
        validationRules.validateRequiredNodes(nodes);
      }).not.toThrow();
    });
  });
});