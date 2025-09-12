# 🧪 Clean Architecture TDD Plan: Zombie Code Elimination with Unified System

## Executive Summary

**OBJECTIVE**: Systematically eliminate zombie code from the legacy `AddContainerNodeUseCase` system by replacing it with the unified `CreateUnifiedNodeUseCase` system using Test-Driven Development (TDD).

**METHODOLOGY**: Red-Green-Refactor TDD loop to ensure architectural compliance and no regression

**SCOPE**: Complete elimination of zombie patterns across all Clean Architecture layers

---

## Current State Analysis

### ✅ UNIFIED SYSTEM (Already Implemented)
- `CreateUnifiedNodeUseCase` - Application Layer
- `UnifiedNode` + `NodeFactory` - Domain Layer  
- `CreateNodeCommand` interface - Command Layer
- Supports all 5 NodeTypes (IO, Stage, Tether, KB, FunctionModelContainer)
- Full test coverage with passing integration tests
- Production-ready implementation

### 🧟 ZOMBIE CODE (To Be Eliminated)

#### Domain Layer Zombies
**File**: `C:\Users\alant\OneDrive\Desktop\Projects\silver-ai-automation\lib\domain\entities\function-model.ts`
- **Line 553-578**: `addContainerNode()` method 
- **Impact**: 12+ test references in `function-model.test.ts`
- **Problem**: Duplicates `addNode()` functionality with different name

#### Command Interface Zombies  
**File**: `C:\Users\alant\OneDrive\Desktop\Projects\silver-ai-automation\lib\use-cases\commands\node-commands.ts`
- **Lines 5-12**: `AddContainerNodeCommand` interface
- **Impact**: 5+ import references across layers
- **Problem**: Fragmented command structure (only 2 NodeTypes vs unified 5 NodeTypes)

#### Application Service Zombies
**File**: `C:\Users\alant\OneDrive\Desktop\Projects\silver-ai-automation\lib\use-cases\function-model\manage-workflow-nodes-use-case.ts`
- **Lines 75-82**: `AddContainerNodeCommand` usage in `addNode()` method
- **Lines 116-162**: Hardcoded type mapping (only IO + Stage)
- **Problem**: Limited to 2 node types, bypasses unified system

#### Import/Export Chain Zombies
**Multiple Files**: References to zombie interfaces propagated across:
- `app/actions/node-actions.ts` (Line 7 import)
- `lib/use-cases/index.ts` (export references)
- Various test fixture files

---

## TDD Implementation Strategy

### Phase 1: Domain Layer Zombie Method Replacement
**Red → Green → Refactor Pattern**

### Phase 2: Command Interface Zombie Replacement  
**Interface Migration with Test Guards**

### Phase 3: Application Service Zombie Case Replacement
**Use Case Integration Testing**

### Phase 4: Import Chain Zombie Cleanup
**Dependency Graph Validation**

---

## Phase 1: Domain Layer TDD Plan

### 🔴 RED: Write Failing Tests for Unified Domain Behavior

#### Test 1.1: addContainerNode Should Delegate to addNode
**File**: `tests/unit/domain/entities/function-model-zombie-elimination.test.ts`

```typescript
describe('FunctionModel Zombie Code Elimination', () => {
  describe('addContainerNode method deprecation', () => {
    it('should_delegate_addContainerNode_to_addNode_for_backward_compatibility', () => {
      // RED: Test should fail initially - addContainerNode should call addNode internally
      const model = TestFactories.createValidModel();
      const ioNode = new IONodeBuilder().withModelId(model.modelId).build();
      
      // Spy on addNode to verify delegation
      const addNodeSpy = jest.spyOn(model, 'addNode');
      
      const result = model.addContainerNode(ioNode);
      
      expect(result).toBeValidResult();
      expect(addNodeSpy).toHaveBeenCalledWith(ioNode);
      expect(addNodeSpy).toHaveBeenCalledTimes(1);
    });
    
    it('should_mark_addContainerNode_as_deprecated_in_jsdoc', () => {
      // RED: Should have @deprecated JSDoc annotation
      const model = TestFactories.createValidModel();
      const methodMetadata = Reflect.getMetadata('deprecated', model.addContainerNode);
      expect(methodMetadata).toBeTruthy();
    });
  });
});
```

#### Test 1.2: Domain Method Behavior Equivalence
```typescript
describe('Domain method behavior equivalence', () => {
  it('should_produce_identical_results_between_addNode_and_addContainerNode', () => {
    // RED: Both methods should behave identically
    const model1 = TestFactories.createValidModel();
    const model2 = TestFactories.createValidModel();
    const nodeData = { /* identical node props */ };
    
    const node1 = new IONodeBuilder().withData(nodeData).build();
    const node2 = new IONodeBuilder().withData(nodeData).build();
    
    const result1 = model1.addNode(node1);
    const result2 = model2.addContainerNode(node2);
    
    expect(result1.isSuccess).toBe(result2.isSuccess);
    expect(model1.nodes.size).toBe(model2.nodes.size);
  });
});
```

### 🟢 GREEN: Implement Minimal Code to Pass Tests

#### Step 1.1: Update Domain Method with Deprecation
**File**: `lib/domain/entities/function-model.ts`

```typescript
/**
 * @deprecated Use addNode() instead. This method will be removed in next major version.
 * addContainerNode is maintained for backward compatibility only.
 */
public addContainerNode(node: Node): Result<void> {
  // Delegate to unified addNode method
  return this.addNode(node);
}
```

### 🔵 REFACTOR: Clean Architecture Compliance Check

#### Test 1.3: Architectural Boundary Validation
```typescript
describe('Clean Architecture boundary validation', () => {
  it('should_not_violate_dependency_inversion_principle', () => {
    // Domain layer should not depend on outer layers
    const domainMethods = ['addNode', 'addContainerNode'];
    domainMethods.forEach(method => {
      const methodImpl = FunctionModel.prototype[method].toString();
      expect(methodImpl).not.toContain('import');
      expect(methodImpl).not.toContain('infrastructure');
      expect(methodImpl).not.toContain('Repository');
    });
  });
});
```

---

## Phase 2: Command Interface TDD Plan

### 🔴 RED: Tests for Unified Command Interface

#### Test 2.1: AddContainerNodeCommand Should Map to CreateNodeCommand
**File**: `tests/unit/use-cases/commands/zombie-command-elimination.test.ts`

```typescript
describe('Command Interface Zombie Elimination', () => {
  describe('AddContainerNodeCommand deprecation', () => {
    it('should_convert_AddContainerNodeCommand_to_CreateNodeCommand', () => {
      // RED: Conversion utility should exist
      const zombieCommand: AddContainerNodeCommand = {
        modelId: 'test-model',
        nodeType: ContainerNodeType.IO_NODE,
        name: 'Test Node',
        position: { x: 100, y: 200 },
        userId: 'user-123'
      };
      
      const unifiedCommand = convertZombieCommand(zombieCommand);
      
      expect(unifiedCommand).toMatchObject({
        modelId: 'test-model',
        nodeType: NodeType.IO_NODE,
        name: 'Test Node', 
        position: { x: 100, y: 200 },
        userId: 'user-123'
      });
    });
    
    it('should_support_all_container_node_types_in_conversion', () => {
      // RED: Should handle both IO_NODE and STAGE_NODE
      const ioCommand = createZombieCommand(ContainerNodeType.IO_NODE);
      const stageCommand = createZombieCommand(ContainerNodeType.STAGE_NODE);
      
      const ioUnified = convertZombieCommand(ioCommand);  
      const stageUnified = convertZombieCommand(stageCommand);
      
      expect(ioUnified.nodeType).toBe(NodeType.IO_NODE);
      expect(stageUnified.nodeType).toBe(NodeType.STAGE_NODE);
    });
  });
});
```

### 🟢 GREEN: Command Conversion Utility

#### Step 2.1: Create Command Converter
**File**: `lib/use-cases/commands/zombie-command-converter.ts`

```typescript
/**
 * Temporary utility for converting zombie AddContainerNodeCommand 
 * to unified CreateNodeCommand during migration phase
 * 
 * @deprecated This converter will be removed after zombie code elimination
 */
export function convertZombieCommand(zombieCommand: AddContainerNodeCommand): CreateNodeCommand {
  return {
    modelId: zombieCommand.modelId,
    nodeType: mapContainerNodeTypeToNodeType(zombieCommand.nodeType),
    name: zombieCommand.name,
    position: zombieCommand.position,
    userId: zombieCommand.userId,
    description: zombieCommand.description,
    typeSpecificData: {} // Default empty for zombie commands
  };
}

function mapContainerNodeTypeToNodeType(containerType: ContainerNodeType): NodeType {
  switch (containerType) {
    case ContainerNodeType.IO_NODE:
      return NodeType.IO_NODE;
    case ContainerNodeType.STAGE_NODE:
      return NodeType.STAGE_NODE;
    default:
      throw new Error(`Unsupported container node type: ${containerType}`);
  }
}
```

---

## Phase 3: Application Service TDD Plan

### 🔴 RED: Application Layer Zombie Case Elimination

#### Test 3.1: ManageWorkflowNodesUseCase Should Use Unified System
**File**: `tests/unit/use-cases/manage-workflow-nodes-zombie-elimination.test.ts`

```typescript
describe('ManageWorkflowNodesUseCase Zombie Elimination', () => {
  describe('addNode method migration', () => {
    it('should_use_CreateUnifiedNodeUseCase_instead_of_zombie_patterns', async () => {
      // RED: Should delegate to unified use case, not use zombie AddContainerNodeCommand
      const mockRepository = createMockRepository();
      const mockEventBus = createMockEventBus();
      const mockUnifiedUseCase = createMockCreateUnifiedNodeUseCase();
      
      const manageUseCase = new ManageWorkflowNodesUseCase(
        mockRepository, 
        mockEventBus,
        mockUnifiedUseCase // NEW: Inject unified use case
      );
      
      const request: AddNodeRequest = {
        type: 'ioNode',
        position: { x: 100, y: 200 },
        data: { label: 'Test Node' }
      };
      
      await manageUseCase.addNode('model-123', request, 'user-456');
      
      // Should call unified use case, not zombie patterns
      expect(mockUnifiedUseCase.execute).toHaveBeenCalledWith({
        modelId: 'model-123',
        nodeType: NodeType.IO_NODE,
        name: 'Test Node',
        position: { x: 100, y: 200 },
        userId: 'user-456'
      });
    });
    
    it('should_support_all_5_node_types_not_just_2', async () => {
      // RED: Should support KB, Tether, FunctionModelContainer in addition to IO and Stage
      const testCases = [
        { reactFlowType: 'ioNode', expectedNodeType: NodeType.IO_NODE },
        { reactFlowType: 'stageNode', expectedNodeType: NodeType.STAGE_NODE },
        { reactFlowType: 'tetherNode', expectedNodeType: NodeType.TETHER_NODE },
        { reactFlowType: 'kbNode', expectedNodeType: NodeType.KB_NODE },
        { reactFlowType: 'containerNode', expectedNodeType: NodeType.FUNCTION_MODEL_CONTAINER_NODE }
      ];
      
      for (const { reactFlowType, expectedNodeType } of testCases) {
        const request = createAddNodeRequest(reactFlowType);
        await manageUseCase.addNode('model-123', request, 'user-456');
        
        expect(mockUnifiedUseCase.execute).toHaveBeenLastCalledWith(
          expect.objectContaining({ nodeType: expectedNodeType })
        );
      }
    });
  });
});
```

### 🟢 GREEN: Application Service Integration

#### Step 3.1: Modify ManageWorkflowNodesUseCase Constructor
**File**: `lib/use-cases/function-model/manage-workflow-nodes-use-case.ts`

```typescript
export class ManageWorkflowNodesUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private eventBus: IEventBus,
    private createUnifiedNodeUseCase: CreateUnifiedNodeUseCase // NEW: Inject unified use case
  ) {}
  
  async addNode(modelId: string, request: AddNodeRequest, userId: string): Promise<Result<NodeDto>> {
    // REPLACE zombie pattern with unified use case delegation
    const command: CreateNodeCommand = {
      modelId,
      nodeType: this.mapReactFlowTypeToUnifiedNodeType(request.type),
      name: request.data.label,
      position: request.position,
      userId,
      description: request.data.description,
      typeSpecificData: this.extractTypeSpecificData(request)
    };
    
    const result = await this.createUnifiedNodeUseCase.execute(command);
    if (result.isFailure) {
      return Result.fail<NodeDto>(result.error);
    }
    
    return Result.ok<NodeDto>(this.mapUnifiedResultToNodeDto(result.value));
  }
  
  // NEW: Support all 5 node types
  private mapReactFlowTypeToUnifiedNodeType(reactFlowType: string): NodeType {
    switch (reactFlowType) {
      case 'ioNode': return NodeType.IO_NODE;
      case 'stageNode': return NodeType.STAGE_NODE;
      case 'tetherNode': return NodeType.TETHER_NODE;
      case 'kbNode': return NodeType.KB_NODE;
      case 'containerNode': return NodeType.FUNCTION_MODEL_CONTAINER_NODE;
      default: throw new Error(`Unsupported React Flow node type: ${reactFlowType}`);
    }
  }
}
```

---

## Phase 4: Import Chain TDD Plan

### 🔴 RED: Dependency Graph Validation Tests

#### Test 4.1: No Zombie Import References
**File**: `tests/unit/architecture/zombie-import-elimination.test.ts`

```typescript
describe('Architecture: Zombie Import Elimination', () => {
  describe('Import chain validation', () => {
    it('should_have_no_AddContainerNodeCommand_imports_in_production_files', async () => {
      // RED: Scan for zombie imports
      const productionFiles = await glob('lib/**/*.ts', { ignore: ['**/*.test.ts'] });
      
      for (const file of productionFiles) {
        const content = await fs.readFile(file, 'utf-8');
        expect(content).not.toContain('AddContainerNodeCommand');
      }
    });
    
    it('should_have_no_addContainerNode_method_calls_in_new_code', async () => {
      // RED: Only legacy test files should call addContainerNode
      const sourceFiles = await glob('lib/**/*.ts', { ignore: ['**/*.test.ts'] });
      
      for (const file of sourceFiles) {
        const content = await fs.readFile(file, 'utf-8');
        expect(content).not.toContain('.addContainerNode(');
      }
    });
  });
  
  describe('Unified system usage validation', () => {
    it('should_use_CreateNodeCommand_interface_in_all_new_code', async () => {
      // RED: Validate unified interface usage
      const actionFiles = await glob('app/actions/**/*.ts');
      
      for (const file of actionFiles) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.includes('nodeType')) {
          expect(content).toContain('CreateNodeCommand');
          expect(content).toContain('NodeType');
        }
      }
    });
  });
});
```

---

## Success Criteria & Validation

### ✅ Completion Checklist

#### Domain Layer
- [ ] `addContainerNode()` marked as `@deprecated` 
- [ ] `addContainerNode()` delegates to `addNode()`
- [ ] All domain tests pass with unified behavior
- [ ] No domain business logic duplicated

#### Command Layer  
- [ ] `AddContainerNodeCommand` marked as `@deprecated`
- [ ] Command converter utility provides migration path
- [ ] `CreateNodeCommand` used in all new code
- [ ] All 5 NodeTypes supported uniformly

#### Application Layer
- [ ] `ManageWorkflowNodesUseCase` uses `CreateUnifiedNodeUseCase`
- [ ] Support for all 5 node types (not just 2)
- [ ] No zombie command patterns in business logic
- [ ] Event publishing works correctly

#### Infrastructure Layer
- [ ] No `AddContainerNodeCommand` imports in production files
- [ ] DI container resolves unified use cases
- [ ] Repository layer supports unified entities
- [ ] Integration tests pass end-to-end

### 📊 Test Coverage Requirements

- **Domain Layer**: 95%+ coverage on unified paths  
- **Application Layer**: 90%+ coverage on use case integration
- **Integration Tests**: All zombie→unified migration paths tested
- **Architecture Tests**: 100% validation of import constraints

### 🚀 Migration Timeline

1. **Week 1**: Phase 1 + 2 (Domain + Command layers)
2. **Week 2**: Phase 3 (Application layer integration)  
3. **Week 3**: Phase 4 (Import cleanup + validation)
4. **Week 4**: Final zombie code removal + documentation

---

## Risk Mitigation

### Backward Compatibility
- **Strategy**: Gradual deprecation with delegation pattern
- **Timeline**: 2 release cycles before removal
- **Documentation**: Clear migration guide for consumers

### Test Coverage
- **Strategy**: Comprehensive test suite covering all migration paths  
- **Automation**: CI pipeline validates no zombie pattern introduction
- **Monitoring**: Code analysis rules prevent zombie code resurrection

### Rollback Plan
- **Strategy**: Feature flags for unified system usage
- **Fallback**: Zombie system remains functional during migration
- **Validation**: A/B testing to compare behavior equivalence

---

## Implementation Notes

**Clean Architecture Compliance**: All changes maintain strict layer separation and dependency inversion

**TDD Cycle Enforcement**: Every change must be driven by a failing test first

**Zero Regression**: Existing functionality preserved through delegation patterns

**Performance**: Unified system is more efficient (single code path vs multiple variants)

This TDD plan ensures systematic elimination of zombie code while maintaining Clean Architecture principles and preventing any regression in functionality.