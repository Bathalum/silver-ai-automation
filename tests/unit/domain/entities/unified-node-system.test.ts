import { Result } from '../../../../lib/domain/shared/result';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Position } from '../../../../lib/domain/value-objects/position';
import { ExecutionMode, NodeStatus } from '../../../../lib/domain/enums';

/**
 * UNIFIED NODE SYSTEM TESTS
 * 
 * This test suite defines the requirements for a unified node system that will
 * fix the current architectural brittleness between UI expectations (6 node types)
 * and domain model support (only 2 + 3 = 5 types, incorrectly split).
 * 
 * These tests will FAIL initially and guide the TDD implementation of:
 * 1. Unified NodeType enum with all 5 types
 * 2. Base Node entity with type-specific behavior
 * 3. Node creation rules and validation
 * 4. Business rule enforcement
 */

// ================================
// 1. UNIFIED NODE TYPE ENUMERATION
// ================================

describe('UnifiedNodeSystem - NodeType Enumeration', () => {
  describe('NodeType enum definition', () => {
    test('NodeType_EnumValues_ShouldMatchUIExpectations', () => {
      // REQUIREMENT: Domain must support all UI node types with correct values
      // This will FAIL because NodeType doesn't exist yet
      const { NodeType } = require('../../../../lib/domain/enums');
      
      expect(NodeType.IO_NODE).toBe('ioNode');
      expect(NodeType.STAGE_NODE).toBe('stageNode');
      expect(NodeType.TETHER_NODE).toBe('tetherNode');
      expect(NodeType.KB_NODE).toBe('kbNode');
      expect(NodeType.FUNCTION_MODEL_CONTAINER).toBe('functionModelContainer');
    });

    test('NodeType_AllValues_ShouldBeValidStrings', () => {
      // REQUIREMENT: All node types must be valid, non-empty strings
      const { NodeType } = require('../../../../lib/domain/enums');
      
      const allTypes = Object.values(NodeType);
      expect(allTypes).toHaveLength(5);
      
      allTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
        expect(type).not.toContain(' '); // No spaces in enum values
      });
    });

    test('NodeType_UITypeMapping_ShouldBeConsistent', () => {
      // REQUIREMENT: UI types must map correctly to domain NodeTypes
      const { NodeType } = require('../../../../lib/domain/enums');
      
      // UI expects these mappings:
      const uiTypeMappings = {
        'input': NodeType.IO_NODE,     // input boundary IO node
        'output': NodeType.IO_NODE,    // output boundary IO node
        'stage': NodeType.STAGE_NODE,
        'kb': NodeType.KB_NODE,
        'tether': NodeType.TETHER_NODE,
        'function-model-container': NodeType.FUNCTION_MODEL_CONTAINER
      };
      
      expect(uiTypeMappings.input).toBe('ioNode');
      expect(uiTypeMappings.output).toBe('ioNode');
      expect(uiTypeMappings.stage).toBe('stageNode');
      expect(uiTypeMappings.kb).toBe('kbNode');
      expect(uiTypeMappings.tether).toBe('tetherNode');
      expect(uiTypeMappings['function-model-container']).toBe('functionModelContainer');
    });
  });
});

// ================================
// 2. BASE NODE ENTITY WITH UNIFIED TYPES
// ================================

describe('UnifiedNodeSystem - Base Node Entity', () => {
  const mockNodeId = { toString: () => 'node-123', equals: jest.fn() } as unknown as NodeId;
  const mockPosition = { x: 100, y: 200 } as Position;
  
  describe('UnifiedNode creation', () => {
    test('UnifiedNode_CreateWithIONodeType_ShouldSucceed', () => {
      // REQUIREMENT: Should be able to create nodes with unified NodeType
      // This will FAIL because UnifiedNode doesn't exist yet
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Input Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      expect(result.value.getNodeType()).toBe(NodeType.IO_NODE);
    });

    test('UnifiedNode_CreateWithStageNodeType_ShouldSucceed', () => {
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Processing Stage',
        nodeType: NodeType.STAGE_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      expect(result.value.getNodeType()).toBe(NodeType.STAGE_NODE);
    });

    test('UnifiedNode_CreateWithTetherNodeType_ShouldSucceed', () => {
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123', 
        name: 'Tether Connection',
        nodeType: NodeType.TETHER_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      expect(result.value.getNodeType()).toBe(NodeType.TETHER_NODE);
    });

    test('UnifiedNode_CreateWithKBNodeType_ShouldSucceed', () => {
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Knowledge Base',
        nodeType: NodeType.KB_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      expect(result.value.getNodeType()).toBe(NodeType.KB_NODE);
    });

    test('UnifiedNode_CreateWithFunctionModelContainerType_ShouldSucceed', () => {
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Function Model Container',
        nodeType: NodeType.FUNCTION_MODEL_CONTAINER,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      expect(result.value.getNodeType()).toBe(NodeType.FUNCTION_MODEL_CONTAINER);
    });
  });

  describe('Common node properties', () => {
    test('UnifiedNode_CommonProperties_ShouldBeAccessible', () => {
      // REQUIREMENT: All node types must have consistent common properties
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Test Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.PARALLEL,
        status: NodeStatus.ACTIVE,
        timeout: 5000,
        metadata: { key: 'value' },
        visualProperties: { width: 200, height: 100 }
      };

      const result = UnifiedNode.create(nodeProps);
      const node = result.value;
      
      expect(node.nodeId).toBe(mockNodeId);
      expect(node.modelId).toBe('model-123');
      expect(node.name).toBe('Test Node');
      expect(node.getNodeType()).toBe(NodeType.IO_NODE);
      expect(node.position).toBe(mockPosition);
      expect(node.executionType).toBe(ExecutionMode.PARALLEL);
      expect(node.status).toBe(NodeStatus.ACTIVE);
      expect(node.timeout).toBe(5000);
      expect(node.metadata).toEqual({ key: 'value' });
      expect(node.visualProperties).toEqual({ width: 200, height: 100 });
    });
  });
});

// ================================
// 3. TYPE-SPECIFIC NODE CREATION AND VALIDATION
// ================================

describe('UnifiedNodeSystem - Type-Specific Creation Rules', () => {
  const mockNodeId = { toString: () => 'node-123', equals: jest.fn() } as unknown as NodeId;
  const mockPosition = { x: 100, y: 200 } as Position;

  describe('IO Node specific validation', () => {
    test('IONode_WithInputBoundary_ShouldRequireInputContract', () => {
      // REQUIREMENT: IO nodes with input boundary must have input data contracts
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Input Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'input',
          // Missing inputDataContract - should cause validation warning
        }
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value.validate();
      expect(validation.value.warnings).toContain('Input node should have an input data contract defined');
    });

    test('IONode_WithOutputBoundary_ShouldNotHaveDependencies', () => {
      // REQUIREMENT: Output IO nodes should have at least one dependency
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Output Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [], // Output nodes should have dependencies
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'output'
        }
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value.validate();
      expect(validation.value.warnings).toContain('Output nodes should have at least one dependency');
    });

    test('IONode_WithInputBoundary_ShouldNotHaveDependencies', () => {
      // REQUIREMENT: Input IO nodes should not have dependencies
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const mockDependency = { toString: () => 'dep-123', equals: jest.fn() } as unknown as NodeId;
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Input Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [mockDependency], // Input nodes should not have dependencies
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'input'
        }
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value.validate();
      expect(validation.value.errors).toContain('Input nodes should not have dependencies on other nodes');
    });
  });

  describe('Stage Node specific validation', () => {
    test('StageNode_Creation_ShouldRequireProcessingConfig', () => {
      // REQUIREMENT: Stage nodes must have processing configuration
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Processing Stage',
        nodeType: NodeType.STAGE_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        stageData: {
          // Missing processing configuration
        }
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value.validate();
      expect(validation.value.warnings).toContain('Stage node should have processing configuration defined');
    });
  });

  describe('Tether Node specific validation', () => {
    test('TetherNode_Creation_ShouldRequireConnectionConfig', () => {
      // REQUIREMENT: Tether nodes must have connection configuration
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Tether Connection',
        nodeType: NodeType.TETHER_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        tetherData: {
          // Missing connection configuration
        }
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value.validate();
      expect(validation.value.warnings).toContain('Tether node should have connection configuration defined');
    });
  });

  describe('KB Node specific validation', () => {
    test('KBNode_Creation_ShouldRequireKnowledgeSource', () => {
      // REQUIREMENT: KB nodes must have knowledge source configuration
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Knowledge Base',
        nodeType: NodeType.KB_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        kbData: {
          // Missing knowledge source configuration
        }
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value.validate();
      expect(validation.value.warnings).toContain('KB node should have knowledge source configuration defined');
    });
  });

  describe('Function Model Container specific validation', () => {
    test('FunctionModelContainer_Creation_ShouldRequireModelReference', () => {
      // REQUIREMENT: Function model container nodes must reference a valid function model
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Function Model Container',
        nodeType: NodeType.FUNCTION_MODEL_CONTAINER,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        containerData: {
          // Missing nested model reference
        }
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isSuccess).toBe(true);
      
      const validation = result.value.validate();
      expect(validation.value.errors).toContain('Function model container must reference a valid nested function model');
    });
  });
});

// ================================
// 4. NODE BEHAVIOR CONTRACTS
// ================================

describe('UnifiedNodeSystem - Node Behavior Contracts', () => {
  const mockNodeId = { toString: () => 'node-123', equals: jest.fn() } as unknown as NodeId;
  const mockPosition = { x: 100, y: 200 } as Position;

  describe('Type-specific capabilities', () => {
    test('IONode_Capabilities_ShouldMatchType', () => {
      // REQUIREMENT: Each node type must have correct capabilities
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'IO Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        ioData: { boundaryType: 'input' }
      };

      const result = UnifiedNode.create(nodeProps);
      const node = result.value;
      
      expect(node.canProcess()).toBe(false); // IO nodes don't process
      expect(node.canStore()).toBe(false);   // IO nodes don't store
      expect(node.canTransfer()).toBe(true);  // IO nodes transfer data
      expect(node.canNest()).toBe(false);    // IO nodes don't nest other models
    });

    test('StageNode_Capabilities_ShouldMatchType', () => {
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Stage Node',
        nodeType: NodeType.STAGE_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        stageData: {}
      };

      const result = UnifiedNode.create(nodeProps);
      const node = result.value;
      
      expect(node.canProcess()).toBe(true);  // Stage nodes process
      expect(node.canStore()).toBe(false);   // Stage nodes don't store
      expect(node.canTransfer()).toBe(true); // Stage nodes transfer data
      expect(node.canNest()).toBe(false);    // Stage nodes don't nest
    });

    test('TetherNode_Capabilities_ShouldMatchType', () => {
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Tether Node',
        nodeType: NodeType.TETHER_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        tetherData: {}
      };

      const result = UnifiedNode.create(nodeProps);
      const node = result.value;
      
      expect(node.canProcess()).toBe(false); // Tether nodes don't process
      expect(node.canStore()).toBe(false);   // Tether nodes don't store
      expect(node.canTransfer()).toBe(true); // Tether nodes transfer data
      expect(node.canNest()).toBe(false);    // Tether nodes don't nest
    });

    test('KBNode_Capabilities_ShouldMatchType', () => {
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'KB Node',
        nodeType: NodeType.KB_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        kbData: {}
      };

      const result = UnifiedNode.create(nodeProps);
      const node = result.value;
      
      expect(node.canProcess()).toBe(false); // KB nodes don't process
      expect(node.canStore()).toBe(true);    // KB nodes store knowledge
      expect(node.canTransfer()).toBe(true); // KB nodes transfer knowledge
      expect(node.canNest()).toBe(false);    // KB nodes don't nest
    });

    test('FunctionModelContainer_Capabilities_ShouldMatchType', () => {
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Function Model Container',
        nodeType: NodeType.FUNCTION_MODEL_CONTAINER,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        containerData: { nestedModelId: 'nested-123' }
      };

      const result = UnifiedNode.create(nodeProps);
      const node = result.value;
      
      expect(node.canProcess()).toBe(true);  // Container nodes process through nested model
      expect(node.canStore()).toBe(false);   // Container nodes don't store directly
      expect(node.canTransfer()).toBe(true); // Container nodes transfer data
      expect(node.canNest()).toBe(true);     // Container nodes nest other models
    });
  });

  describe('Type checking and runtime validation', () => {
    test('UnifiedNode_TypeGuards_ShouldWorkCorrectly', () => {
      // REQUIREMENT: Type guards must work correctly for each node type
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const ioNodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'IO Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        ioData: { boundaryType: 'input' }
      };

      const result = UnifiedNode.create(ioNodeProps);
      const node = result.value;
      
      expect(node.isIONode()).toBe(true);
      expect(node.isStageNode()).toBe(false);
      expect(node.isTetherNode()).toBe(false);
      expect(node.isKBNode()).toBe(false);
      expect(node.isFunctionModelContainer()).toBe(false);
    });

    test('UnifiedNode_TypeSafety_ShouldPreventInvalidOperations', () => {
      // REQUIREMENT: Type safety should prevent invalid operations on wrong node types
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const ioNodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'IO Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        ioData: { boundaryType: 'input' }
      };

      const result = UnifiedNode.create(ioNodeProps);
      const node = result.value;
      
      // Attempting to access stage-specific methods on IO node should fail
      expect(() => node.getStageConfiguration()).toThrow('Operation not supported for node type: ioNode');
      expect(() => node.getKBSourceConfiguration()).toThrow('Operation not supported for node type: ioNode');
    });
  });
});

// ================================
// 5. BUSINESS RULE ENFORCEMENT
// ================================

describe('UnifiedNodeSystem - Business Rule Enforcement', () => {
  const mockNodeId = { toString: () => 'node-123', equals: jest.fn() } as unknown as NodeId;
  const mockPosition = { x: 100, y: 200 } as Position;

  describe('Node creation business rules', () => {
    test('UnifiedNode_CreateWithInvalidType_ShouldFail', () => {
      // REQUIREMENT: Node creation must reject invalid types
      const { UnifiedNode } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Invalid Node',
        nodeType: 'invalid-type',  // Invalid node type
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid node type');
    });

    test('UnifiedNode_CreateWithEmptyName_ShouldFail', () => {
      // REQUIREMENT: Node names cannot be empty
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: '',  // Empty name
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Node name cannot be empty');
    });

    test('UnifiedNode_CreateWithoutModelId_ShouldFail', () => {
      // REQUIREMENT: Nodes must belong to a model
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: '',  // Empty model ID
        name: 'Test Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Node must belong to a model');
    });
  });

  describe('Type-specific business rules', () => {
    test('IONode_InputBoundaryWithOutputContract_ShouldFail', () => {
      // REQUIREMENT: Input boundary IO nodes cannot have output contracts
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Invalid IO Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'input',
          outputDataContract: { field: 'string' }  // Invalid for input boundary
        }
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Input boundary type cannot have output data contract');
    });

    test('IONode_OutputBoundaryWithInputContract_ShouldFail', () => {
      // REQUIREMENT: Output boundary IO nodes cannot have input contracts
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Invalid IO Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'output',
          inputDataContract: { field: 'string' }  // Invalid for output boundary
        }
      };

      const result = UnifiedNode.create(nodeProps);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Output boundary type cannot have input data contract');
    });

    test('FunctionModelContainer_WithoutNestedModel_ShouldFail', () => {
      // REQUIREMENT: Function model containers must reference a nested model
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'Container Node',
        nodeType: NodeType.FUNCTION_MODEL_CONTAINER,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        containerData: {}  // Missing nestedModelId
      };

      const result = UnifiedNode.create(nodeProps);
      const validation = result.value.validate();
      expect(validation.value.errors).toContain('Function model container must reference a valid nested function model');
    });
  });

  describe('Consistency and integrity rules', () => {
    test('UnifiedNode_AllTypes_ShouldHaveConsistentInterface', () => {
      // REQUIREMENT: All node types must implement consistent base interface
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const nodeTypes = [
        NodeType.IO_NODE,
        NodeType.STAGE_NODE,
        NodeType.TETHER_NODE,
        NodeType.KB_NODE,
        NodeType.FUNCTION_MODEL_CONTAINER
      ];

      nodeTypes.forEach(nodeType => {
        const nodeProps = {
          nodeId: mockNodeId,
          modelId: 'model-123',
          name: `${nodeType} Node`,
          nodeType,
          position: mockPosition,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.DRAFT,
          metadata: {},
          visualProperties: {},
          // Add minimal type-specific data
          ...(nodeType === NodeType.IO_NODE && { ioData: { boundaryType: 'input' } }),
          ...(nodeType === NodeType.STAGE_NODE && { stageData: {} }),
          ...(nodeType === NodeType.TETHER_NODE && { tetherData: {} }),
          ...(nodeType === NodeType.KB_NODE && { kbData: {} }),
          ...(nodeType === NodeType.FUNCTION_MODEL_CONTAINER && { containerData: { nestedModelId: 'nested-123' } })
        };

        const result = UnifiedNode.create(nodeProps);
        expect(result.isSuccess).toBe(true);
        
        const node = result.value;
        
        // All nodes must have these methods
        expect(typeof node.getNodeType).toBe('function');
        expect(typeof node.validate).toBe('function');
        expect(typeof node.canProcess).toBe('function');
        expect(typeof node.canStore).toBe('function');
        expect(typeof node.canTransfer).toBe('function');
        expect(typeof node.canNest).toBe('function');
        expect(typeof node.updateName).toBe('function');
        expect(typeof node.updatePosition).toBe('function');
        expect(typeof node.updateStatus).toBe('function');
        
        // All nodes must have these properties
        expect(node.nodeId).toBeDefined();
        expect(node.modelId).toBeDefined();
        expect(node.name).toBeDefined();
        expect(node.position).toBeDefined();
        expect(node.status).toBeDefined();
        expect(node.metadata).toBeDefined();
        expect(node.visualProperties).toBeDefined();
      });
    });

    test('UnifiedNode_TypeSafety_ShouldEnforceCorrectReturnTypes', () => {
      // REQUIREMENT: Type-specific methods must return correct types
      const { UnifiedNode, NodeType } = require('../../../../lib/domain/entities/unified-node');
      
      const ioNodeProps = {
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: 'IO Node',
        nodeType: NodeType.IO_NODE,
        position: mockPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        ioData: { 
          boundaryType: 'input',
          inputDataContract: { field: 'string' }
        }
      };

      const result = UnifiedNode.create(ioNodeProps);
      const node = result.value;
      
      if (node.isIONode()) {
        expect(typeof node.getIOData).toBe('function');
        expect(node.getIOData().boundaryType).toBe('input');
        expect(typeof node.updateInputDataContract).toBe('function');
        expect(typeof node.updateOutputDataContract).toBe('function');
      }
    });
  });
});

// ================================
// ARCHITECTURAL INTEGRATION TESTS
// ================================

describe('UnifiedNodeSystem - Architectural Integration', () => {
  test('NodeFactory_ShouldCreateCorrectTypeBasedOnInput', () => {
    // REQUIREMENT: Factory should create correct unified node types
    const { NodeFactory, NodeType } = require('../../../../lib/domain/entities/unified-node');
    
    const mockNodeId = { toString: () => 'node-123', equals: jest.fn() } as unknown as NodeId;
    const mockPosition = { x: 100, y: 200 } as Position;
    
    // Test UI type mapping to domain types
    const uiTypeInputs = [
      { uiType: 'input', expectedType: NodeType.IO_NODE, boundaryType: 'input' },
      { uiType: 'output', expectedType: NodeType.IO_NODE, boundaryType: 'output' },
      { uiType: 'stage', expectedType: NodeType.STAGE_NODE },
      { uiType: 'kb', expectedType: NodeType.KB_NODE },
      { uiType: 'tether', expectedType: NodeType.TETHER_NODE },
      { uiType: 'function-model-container', expectedType: NodeType.FUNCTION_MODEL_CONTAINER }
    ];

    uiTypeInputs.forEach(({ uiType, expectedType, boundaryType }) => {
      const result = NodeFactory.createFromUIType({
        nodeId: mockNodeId,
        modelId: 'model-123',
        name: `${uiType} Node`,
        uiType,
        position: mockPosition,
        ...(boundaryType && { boundaryType })
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.getNodeType()).toBe(expectedType);
    });
  });

  test('UnifiedNodeSystem_ShouldReplaceExistingFragmentedSystem', () => {
    // REQUIREMENT: Unified system should completely replace fragmented ContainerNodeType/ActionNodeType
    const { NodeType } = require('../../../../lib/domain/enums');
    
    // Verify that the unified enum contains all required types
    const expectedTypes = [
      'ioNode',
      'stageNode', 
      'tetherNode',
      'kbNode',
      'functionModelContainer'
    ];

    expectedTypes.forEach(expectedType => {
      expect(Object.values(NodeType)).toContain(expectedType);
    });

    // Verify that old fragmented enums are deprecated/removed
    expect(() => {
      const { ContainerNodeType } = require('../../../../lib/domain/enums');
      // This should eventually be removed/deprecated
    }).not.toThrow(); // Currently this will pass, but implementation should deprecate it

    expect(() => {
      const { ActionNodeType } = require('../../../../lib/domain/enums');
      // This should eventually be removed/deprecated  
    }).not.toThrow(); // Currently this will pass, but implementation should deprecate it
  });
});