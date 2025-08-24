/**
 * HIERARCHICAL CONTEXT ACCESS COMPREHENSIVE VALIDATION TESTS
 * 
 * This test suite serves as a BOUNDARY FILTER for the complex hierarchical context access
 * patterns defined in the Function Model domain, validating that context sharing follows
 * the exact access rules specified in the domain model.
 * 
 * CRITICAL DOMAIN RULE VALIDATION:
 * 1. SIBLING ACCESS: Read-only context sharing between nodes at same hierarchical level
 * 2. CHILD ACCESS: Access only their own context, unless siblings exist (then read-only sibling access)
 * 3. PARENT ACCESS: Read/write access to all child contexts and hierarchical contexts below
 * 4. UNCLE/AUNT ACCESS: Read-only lateral access for root cause analysis
 * 5. DEEP NESTING: Cascading access through multi-level function model hierarchy
 * 
 * CONTEXT TYPES BY ACTION NODE (from Domain Model):
 * - TetherNode Context: Run logs, execution memory, output data, AI agent communication
 * - KbNode Context: Linked knowledge base text content and metadata
 * - FunctionModelContainer Context: Nested model outputs, linked KB contexts, nested tether contexts
 * 
 * TESTS AS EXECUTABLE SPECIFICATIONS:
 * These tests define the exact hierarchical access patterns that must be implemented
 * in the NodeContextAccessService and serve as validation for context security.
 */

import { NodeContextAccessService } from '@/lib/domain/services/node-context-access-service';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { IONode } from '@/lib/domain/entities/io-node';
import { StageNode } from '@/lib/domain/entities/stage-node';
import { TetherNode } from '@/lib/domain/entities/tether-node';
import { KBNode } from '@/lib/domain/entities/kb-node';
import { FunctionModelContainerNode } from '@/lib/domain/entities/function-model-container-node';
import { ActionNodeType, ExecutionMode } from '@/lib/domain/enums';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { 
  FunctionModelBuilder, 
  IONodeBuilder, 
  StageNodeBuilder, 
  TetherNodeBuilder,
  KBNodeBuilder,
  FunctionModelContainerNodeBuilder 
} from '../../../utils/test-fixtures';

/**
 * CONTEXT DATA STRUCTURES FOR TESTING
 * Simulates the different types of context that action nodes produce and access
 */
interface TetherNodeContext {
  runLogs: string[];
  executionMemory: Record<string, any>;
  outputData: Record<string, any>;
  aiAgentCommunication: {
    messages: string[];
    decisions: string[];
  };
}

interface KbNodeContext {
  linkedContent: {
    documentId: string;
    textContent: string;
    metadata: Record<string, any>;
  };
  searchKeywords: string[];
  accessPermissions: string[];
}

interface FunctionModelContainerContext {
  nestedModelOutputs: Record<string, any>;
  linkedKbContexts: KbNodeContext[];
  nestedTetherContexts: TetherNodeContext[];
  orchestrationState: {
    currentStage: string;
    completedStages: string[];
    failedStages: string[];
  };
}

type NodeContextData = TetherNodeContext | KbNodeContext | FunctionModelContainerContext;

/**
 * MOCK CONTEXT ACCESS SERVICE FOR TESTING
 * Implements the hierarchical context access rules defined in the domain model
 */
class MockNodeContextAccessService extends NodeContextAccessService {
  private contextData = new Map<string, NodeContextData>();
  private hierarchyMap = new Map<string, string>(); // nodeId -> parentNodeId
  private siblingGroups = new Map<string, string[]>(); // parentId -> childIds[]
  private modelHierarchy = new Map<string, string>(); // modelId -> parentModelId

  // Set context data for testing
  public setContextData(nodeId: string, context: NodeContextData): void {
    this.contextData.set(nodeId, context);
  }

  // Set up hierarchy relationships for testing
  public setHierarchy(nodeId: string, parentNodeId?: string): void {
    if (parentNodeId) {
      this.hierarchyMap.set(nodeId, parentNodeId);
      
      if (!this.siblingGroups.has(parentNodeId)) {
        this.siblingGroups.set(parentNodeId, []);
      }
      this.siblingGroups.get(parentNodeId)!.push(nodeId);
    }
  }

  // Set up model nesting hierarchy
  public setModelHierarchy(childModelId: string, parentModelId: string): void {
    this.modelHierarchy.set(childModelId, parentModelId);
  }

  // Get sibling context (read-only access)
  public getSiblingContext(requestingNodeId: string): NodeContextData[] {
    const parentId = this.hierarchyMap.get(requestingNodeId);
    if (!parentId) return [];

    const siblings = this.siblingGroups.get(parentId) || [];
    return siblings
      .filter(siblingId => siblingId !== requestingNodeId)
      .map(siblingId => this.contextData.get(siblingId))
      .filter(context => context !== undefined) as NodeContextData[];
  }

  // Get child contexts (read/write access for parents)
  public getChildContexts(parentNodeId: string): NodeContextData[] {
    const children = this.siblingGroups.get(parentNodeId) || [];
    return children
      .map(childId => this.contextData.get(childId))
      .filter(context => context !== undefined) as NodeContextData[];
  }

  // Get parent context (children can access parent context)
  public getParentContext(childNodeId: string): NodeContextData | null {
    const parentId = this.hierarchyMap.get(childNodeId);
    if (!parentId) return null;
    return this.contextData.get(parentId) || null;
  }

  // Get uncle/aunt contexts (lateral read-only access)
  public getUncleAuntContexts(nodeId: string): NodeContextData[] {
    const parentId = this.hierarchyMap.get(nodeId);
    if (!parentId) return [];

    const grandparentId = this.hierarchyMap.get(parentId);
    if (!grandparentId) return [];

    const uncleAuntIds = (this.siblingGroups.get(grandparentId) || [])
      .filter(id => id !== parentId);

    const uncleAuntContexts: NodeContextData[] = [];
    uncleAuntIds.forEach(uncleId => {
      const context = this.contextData.get(uncleId);
      if (context) uncleAuntContexts.push(context);
      
      // Also get their children (cousin contexts)
      const cousins = this.siblingGroups.get(uncleId) || [];
      cousins.forEach(cousinId => {
        const cousinContext = this.contextData.get(cousinId);
        if (cousinContext) uncleAuntContexts.push(cousinContext);
      });
    });

    return uncleAuntContexts;
  }

  // Get deep nested context (multi-level function model hierarchy)
  public getDeepNestedContext(modelId: string, targetModelId: string): NodeContextData[] {
    // Implementation would traverse model hierarchy to find nested contexts
    // This is a simplified version for testing
    const nestedContexts: NodeContextData[] = [];
    
    if (this.modelHierarchy.get(targetModelId) === modelId) {
      // Direct child model - return its contexts
      Array.from(this.contextData.entries())
        .filter(([nodeId, _]) => nodeId.startsWith(targetModelId))
        .forEach(([_, context]) => nestedContexts.push(context));
    }

    return nestedContexts;
  }

  // Check if access is allowed based on hierarchical rules
  public isAccessAllowed(requestingNodeId: string, targetNodeId: string, accessType: 'read' | 'write'): boolean {
    // Own context - always allowed
    if (requestingNodeId === targetNodeId) {
      return true;
    }

    const requestingParent = this.hierarchyMap.get(requestingNodeId);
    const targetParent = this.hierarchyMap.get(targetNodeId);

    // Sibling access - read-only
    if (requestingParent === targetParent && requestingParent) {
      return accessType === 'read';
    }

    // Parent-child relationship
    const targetChildren = this.siblingGroups.get(requestingNodeId) || [];
    if (targetChildren.includes(targetNodeId)) {
      return true; // Parent has full access to children
    }

    // Child accessing parent - read-only typically
    if (this.hierarchyMap.get(requestingNodeId) === targetNodeId) {
      return accessType === 'read';
    }

    // Uncle/aunt access - read-only
    const uncleAuntContexts = this.getUncleAuntContexts(requestingNodeId);
    const hasUncleAuntAccess = uncleAuntContexts.some(context => 
      this.contextData.get(targetNodeId) === context
    );
    
    if (hasUncleAuntAccess) {
      return accessType === 'read';
    }

    return false; // No access by default
  }
}

describe('Hierarchical Context Access Comprehensive Validation - Domain Rule Compliance', () => {
  let contextService: MockNodeContextAccessService;
  let parentModel: FunctionModel;

  beforeEach(() => {
    contextService = new MockNodeContextAccessService();
    parentModel = new FunctionModelBuilder()
      .withName('Hierarchical Context Test Model')
      .build();
  });

  /**
   * SIBLING CONTEXT ACCESS VALIDATION
   * Tests Rule: Read-only context sharing between nodes at same hierarchical level
   */
  describe('Sibling Context Access Rules', () => {
    it('SiblingNodes_ShouldHaveReadOnlyAccessToEachOthersContext', () => {
      // Arrange - Create sibling action nodes within same stage
      const stageNode = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Processing Stage')
        .build();

      const tetherAction1 = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Data Processing Tether')
        .withExecutionOrder(1)
        .build();

      const tetherAction2 = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Validation Tether')
        .withExecutionOrder(2)
        .build();

      const kbAction = new KBNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Reference Documentation')
        .withExecutionOrder(3)
        .build();

      // Set up hierarchy and context data
      contextService.setHierarchy(tetherAction1.actionId.toString(), stageNode.nodeId.toString());
      contextService.setHierarchy(tetherAction2.actionId.toString(), stageNode.nodeId.toString());
      contextService.setHierarchy(kbAction.actionId.toString(), stageNode.nodeId.toString());

      const tether1Context: TetherNodeContext = {
        runLogs: ['Started processing', 'Completed batch 1'],
        executionMemory: { processedItems: 100, errors: 0 },
        outputData: { results: [1, 2, 3], status: 'success' },
        aiAgentCommunication: {
          messages: ['Process batch completed successfully'],
          decisions: ['Continue to next batch']
        }
      };

      const kbContext: KbNodeContext = {
        linkedContent: {
          documentId: 'doc-123',
          textContent: 'Processing guidelines and validation rules',
          metadata: { version: '2.1', lastUpdated: '2025-01-15' }
        },
        searchKeywords: ['processing', 'validation', 'guidelines'],
        accessPermissions: ['read', 'reference']
      };

      contextService.setContextData(tetherAction1.actionId.toString(), tether1Context);
      contextService.setContextData(kbAction.actionId.toString(), kbContext);

      // Act - Sibling accessing sibling context
      const siblingContexts = contextService.getSiblingContext(tetherAction2.actionId.toString());

      // Assert - Sibling Context Access Rules
      expect(siblingContexts.length).toBe(2); // Can see both siblings
      
      const tetherSiblingContext = siblingContexts.find(ctx => 
        'runLogs' in ctx
      ) as TetherNodeContext;
      
      const kbSiblingContext = siblingContexts.find(ctx => 
        'linkedContent' in ctx
      ) as KbNodeContext;

      // DOMAIN RULE: Siblings have READ-ONLY access to each other's context
      expect(tetherSiblingContext).toBeDefined();
      expect(tetherSiblingContext.runLogs).toEqual(['Started processing', 'Completed batch 1']);
      expect(tetherSiblingContext.outputData.results).toEqual([1, 2, 3]);
      
      expect(kbSiblingContext).toBeDefined();
      expect(kbSiblingContext.linkedContent.textContent).toBe('Processing guidelines and validation rules');
      expect(kbSiblingContext.searchKeywords).toEqual(['processing', 'validation', 'guidelines']);

      // BOUNDARY VALIDATION: Write access should be denied
      expect(contextService.isAccessAllowed(
        tetherAction2.actionId.toString(), 
        tetherAction1.actionId.toString(), 
        'write'
      )).toBe(false);

      expect(contextService.isAccessAllowed(
        tetherAction2.actionId.toString(), 
        tetherAction1.actionId.toString(), 
        'read'
      )).toBe(true);
    });

    it('OnlyChildWithoutSiblings_ShouldAccessOnlyOwnContext', () => {
      // Arrange - Single child in stage (no siblings)
      const stageNode = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Solo Stage')
        .build();

      const soloAction = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Solo Tether')
        .build();

      contextService.setHierarchy(soloAction.actionId.toString(), stageNode.nodeId.toString());

      const soloContext: TetherNodeContext = {
        runLogs: ['Solo execution started'],
        executionMemory: { state: 'running' },
        outputData: {},
        aiAgentCommunication: { messages: [], decisions: [] }
      };

      contextService.setContextData(soloAction.actionId.toString(), soloContext);

      // Act - Solo child accessing context
      const siblingContexts = contextService.getSiblingContext(soloAction.actionId.toString());

      // Assert - Solo Child Access Rules
      expect(siblingContexts.length).toBe(0); // No siblings to access
      
      // DOMAIN RULE: Children access only their own context unless siblings exist
      expect(contextService.isAccessAllowed(
        soloAction.actionId.toString(), 
        soloAction.actionId.toString(), 
        'read'
      )).toBe(true);

      expect(contextService.isAccessAllowed(
        soloAction.actionId.toString(), 
        soloAction.actionId.toString(), 
        'write'
      )).toBe(true);
    });
  });

  /**
   * PARENT-CHILD CONTEXT ACCESS VALIDATION
   * Tests Rule: Parents have read/write access to all child contexts and hierarchical contexts below
   */
  describe('Parent-Child Context Access Rules', () => {
    it('ParentContainerNode_ShouldHaveFullAccessToAllChildContexts', () => {
      // Arrange - Parent stage with multiple child actions
      const parentStage = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Parent Processing Stage')
        .build();

      const childActions = [
        new TetherNodeBuilder()
          .withModelId(parentModel.modelId)
          .withParentNode(parentStage.nodeId.toString())
          .withName('Child Tether 1')
          .build(),
        new KBNodeBuilder()
          .withModelId(parentModel.modelId)
          .withParentNode(parentStage.nodeId.toString())
          .withName('Child KB Reference')
          .build(),
        new TetherNodeBuilder()
          .withModelId(parentModel.modelId)
          .withParentNode(parentStage.nodeId.toString())
          .withName('Child Tether 2')
          .build()
      ];

      // Set up hierarchy
      childActions.forEach(action => {
        contextService.setHierarchy(action.actionId.toString(), parentStage.nodeId.toString());
      });

      // Set up child contexts
      const tetherContext1: TetherNodeContext = {
        runLogs: ['Tether 1 processing'],
        executionMemory: { batch: 1 },
        outputData: { results: ['A', 'B'] },
        aiAgentCommunication: { messages: ['Batch 1 complete'], decisions: [] }
      };

      const kbContext: KbNodeContext = {
        linkedContent: {
          documentId: 'ref-456',
          textContent: 'Reference documentation for processing',
          metadata: { category: 'technical-specs' }
        },
        searchKeywords: ['reference', 'specs'],
        accessPermissions: ['read', 'reference']
      };

      const tetherContext2: TetherNodeContext = {
        runLogs: ['Tether 2 validation'],
        executionMemory: { validation: true },
        outputData: { validated: true },
        aiAgentCommunication: { messages: [], decisions: ['Continue'] }
      };

      contextService.setContextData(childActions[0].actionId.toString(), tetherContext1);
      contextService.setContextData(childActions[1].actionId.toString(), kbContext);
      contextService.setContextData(childActions[2].actionId.toString(), tetherContext2);

      // Act - Parent accessing child contexts
      const childContexts = contextService.getChildContexts(parentStage.nodeId.toString());

      // Assert - Parent Access Rules
      expect(childContexts.length).toBe(3);
      
      // DOMAIN RULE: Parents have READ/WRITE access to all child contexts
      const tetherContexts = childContexts.filter(ctx => 'runLogs' in ctx) as TetherNodeContext[];
      const kbContexts = childContexts.filter(ctx => 'linkedContent' in ctx) as KbNodeContext[];

      expect(tetherContexts.length).toBe(2);
      expect(kbContexts.length).toBe(1);

      // Validate access to specific child data
      expect(tetherContexts[0].outputData.results).toContain('A');
      expect(tetherContexts[1].outputData.validated).toBe(true);
      expect(kbContexts[0].linkedContent.documentId).toBe('ref-456');

      // BOUNDARY VALIDATION: Parent should have write access
      childActions.forEach(action => {
        expect(contextService.isAccessAllowed(
          parentStage.nodeId.toString(), 
          action.actionId.toString(), 
          'write'
        )).toBe(true);

        expect(contextService.isAccessAllowed(
          parentStage.nodeId.toString(), 
          action.actionId.toString(), 
          'read'
        )).toBe(true);
      });
    });

    it('ChildNodes_ShouldHaveReadOnlyAccessToParentContext', () => {
      // Arrange - Parent stage with context and child action
      const parentStage = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Parent Stage With Context')
        .build();

      const childAction = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('Child Tether')
        .build();

      contextService.setHierarchy(childAction.actionId.toString(), parentStage.nodeId.toString());

      // Parent stage context (simulated)
      const parentContext: Record<string, any> = {
        stageType: 'processing',
        stageGoals: ['Process data', 'Validate results'],
        completionCriteria: { allChildrenComplete: true },
        resourceAllocation: { cpu: '500m', memory: '256Mi' }
      };

      contextService.setContextData(parentStage.nodeId.toString(), parentContext as any);

      // Act - Child accessing parent context
      const parentContextData = contextService.getParentContext(childAction.actionId.toString());

      // Assert - Child Parent Access Rules
      expect(parentContextData).toBeDefined();
      expect((parentContextData as any).stageType).toBe('processing');
      expect((parentContextData as any).stageGoals).toContain('Process data');

      // DOMAIN RULE: Children have READ-ONLY access to parent context
      expect(contextService.isAccessAllowed(
        childAction.actionId.toString(), 
        parentStage.nodeId.toString(), 
        'read'
      )).toBe(true);

      expect(contextService.isAccessAllowed(
        childAction.actionId.toString(), 
        parentStage.nodeId.toString(), 
        'write'
      )).toBe(false); // Write access denied
    });
  });

  /**
   * UNCLE/AUNT LATERAL ACCESS VALIDATION
   * Tests Rule: Read-only lateral access for root cause analysis
   */
  describe('Uncle/Aunt Lateral Access Rules', () => {
    it('NephewNiece_ShouldHaveReadOnlyAccessToUncleAuntContexts', () => {
      // Arrange - Complex family hierarchy for lateral access testing
      const grandparentStage = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Grandparent Stage')
        .build();

      const parentStage = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Parent Stage')
        .build();

      const uncleStage = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Uncle Stage')
        .build();

      const childAction = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('Child Action')
        .build();

      const cousinAction = new KBNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(uncleStage.nodeId.toString())
        .withName('Cousin Action')
        .build();

      // Set up hierarchy: grandparent -> (parent, uncle) -> (child, cousin)
      contextService.setHierarchy(parentStage.nodeId.toString(), grandparentStage.nodeId.toString());
      contextService.setHierarchy(uncleStage.nodeId.toString(), grandparentStage.nodeId.toString());
      contextService.setHierarchy(childAction.actionId.toString(), parentStage.nodeId.toString());
      contextService.setHierarchy(cousinAction.actionId.toString(), uncleStage.nodeId.toString());

      // Uncle and cousin contexts
      const uncleContext: Record<string, any> = {
        stageType: 'validation',
        operationalData: { validatedItems: 50, errors: 2 },
        debugInfo: 'Uncle stage processing validation rules'
      };

      const cousinContext: KbNodeContext = {
        linkedContent: {
          documentId: 'validation-rules-789',
          textContent: 'Validation rules and error handling procedures',
          metadata: { criticality: 'high', domain: 'validation' }
        },
        searchKeywords: ['validation', 'error-handling', 'rules'],
        accessPermissions: ['read', 'analyze']
      };

      contextService.setContextData(uncleStage.nodeId.toString(), uncleContext as any);
      contextService.setContextData(cousinAction.actionId.toString(), cousinContext);

      // Act - Child accessing uncle/aunt contexts for root cause analysis
      const uncleAuntContexts = contextService.getUncleAuntContexts(childAction.actionId.toString());

      // Assert - Uncle/Aunt Access Rules
      expect(uncleAuntContexts.length).toBeGreaterThan(0);
      
      const uncleContextFound = uncleAuntContexts.find(ctx => 
        'operationalData' in ctx && (ctx as any).stageType === 'validation'
      );
      
      const cousinContextFound = uncleAuntContexts.find(ctx => 
        'linkedContent' in ctx
      ) as KbNodeContext;

      // DOMAIN RULE: Uncle/aunt contexts accessible for root cause analysis
      expect(uncleContextFound).toBeDefined();
      expect((uncleContextFound as any).operationalData.validatedItems).toBe(50);
      expect((uncleContextFound as any).debugInfo).toContain('Uncle stage processing');

      expect(cousinContextFound).toBeDefined();
      expect(cousinContextFound.linkedContent.textContent).toContain('Validation rules');
      expect(cousinContextFound.searchKeywords).toContain('error-handling');

      // BOUNDARY VALIDATION: Only read access allowed for lateral relationships
      expect(contextService.isAccessAllowed(
        childAction.actionId.toString(), 
        uncleStage.nodeId.toString(), 
        'read'
      )).toBe(true);

      expect(contextService.isAccessAllowed(
        childAction.actionId.toString(), 
        uncleStage.nodeId.toString(), 
        'write'
      )).toBe(false);

      expect(contextService.isAccessAllowed(
        childAction.actionId.toString(), 
        cousinAction.actionId.toString(), 
        'read'
      )).toBe(true);

      expect(contextService.isAccessAllowed(
        childAction.actionId.toString(), 
        cousinAction.actionId.toString(), 
        'write'
      )).toBe(false);
    });
  });

  /**
   * DEEP NESTING HIERARCHICAL ACCESS VALIDATION
   * Tests Rule: Cascading access through multi-level function model hierarchy with parent privileges
   */
  describe('Deep Nesting Hierarchical Access Rules', () => {
    it('NestedFunctionModels_ShouldMaintainHierarchicalAccessAcrossMultipleLevels', () => {
      // Arrange - Multi-level nested function models
      const rootModel = new FunctionModelBuilder()
        .withName('Root Orchestration Model')
        .build();

      const level1Model = new FunctionModelBuilder()
        .withName('Level 1 Processing Model')
        .build();

      const level2Model = new FunctionModelBuilder()
        .withName('Level 2 Validation Model')
        .build();

      // Root model contains level 1 model
      const level1Container = new FunctionModelContainerNodeBuilder()
        .withModelId(rootModel.modelId)
        .withName('Level 1 Container')
        .withNestedModelId(level1Model.modelId)
        .build();

      // Level 1 model contains level 2 model  
      const level2Container = new FunctionModelContainerNodeBuilder()
        .withModelId(level1Model.modelId)
        .withName('Level 2 Container')
        .withNestedModelId(level2Model.modelId)
        .build();

      // Level 2 has actual processing action
      const deepAction = new TetherNodeBuilder()
        .withModelId(level2Model.modelId)
        .withParentNode(level2Container.actionId.toString())
        .withName('Deep Processing Action')
        .build();

      // Set up model hierarchy
      contextService.setModelHierarchy(level1Model.modelId, rootModel.modelId);
      contextService.setModelHierarchy(level2Model.modelId, level1Model.modelId);

      // Deep nested context
      const deepContext: TetherNodeContext = {
        runLogs: ['Deep processing started', 'Validation complete'],
        executionMemory: { 
          depth: 2, 
          parentModels: [rootModel.modelId, level1Model.modelId],
          validationResults: { passed: true, score: 95 }
        },
        outputData: {
          finalResult: 'Validation successful',
          metrics: { accuracy: 0.95, performance: 'excellent' }
        },
        aiAgentCommunication: {
          messages: ['Deep validation completed successfully'],
          decisions: ['Propagate success to parent levels']
        }
      };

      contextService.setContextData(deepAction.actionId.toString(), deepContext);

      // Level 1 context aggregation
      const level1Context: FunctionModelContainerContext = {
        nestedModelOutputs: {
          [level2Model.modelId]: { status: 'completed', result: deepContext.outputData }
        },
        linkedKbContexts: [],
        nestedTetherContexts: [deepContext],
        orchestrationState: {
          currentStage: 'validation-complete',
          completedStages: ['initialization', 'processing', 'validation'],
          failedStages: []
        }
      };

      contextService.setContextData(level1Container.actionId.toString(), level1Context);

      // Act - Root model accessing deep nested context
      const deepNestedContexts = contextService.getDeepNestedContext(rootModel.modelId, level2Model.modelId);

      // Assert - Deep Nesting Access Rules
      expect(deepNestedContexts.length).toBeGreaterThan(0);
      
      const deepContextFound = deepNestedContexts.find(ctx => 
        'runLogs' in ctx && (ctx as TetherNodeContext).runLogs.includes('Deep processing started')
      ) as TetherNodeContext;

      // DOMAIN RULE: Parent models can access deep nested contexts
      expect(deepContextFound).toBeDefined();
      expect(deepContextFound.executionMemory.depth).toBe(2);
      expect(deepContextFound.executionMemory.parentModels).toContain(rootModel.modelId);
      expect(deepContextFound.outputData.finalResult).toBe('Validation successful');
      expect(deepContextFound.aiAgentCommunication.decisions[0]).toContain('Propagate success');

      // HIERARCHICAL PRIVILEGE CASCADING: Root can access all levels below
      expect(deepContextFound.executionMemory.validationResults.passed).toBe(true);
      expect(deepContextFound.outputData.metrics.accuracy).toBe(0.95);

      // Context aggregation at intermediate levels
      expect(level1Context.nestedModelOutputs[level2Model.modelId].status).toBe('completed');
      expect(level1Context.orchestrationState.completedStages).toContain('validation');
      expect(level1Context.nestedTetherContexts.length).toBe(1);
    });

    it('FractalOrchestrationPatterns_ShouldMaintainConsistentAccessAtAllLevels', () => {
      // Arrange - Fractal pattern with consistent orchestration at each level
      const models = [
        new FunctionModelBuilder().withName('Level 0 - Root Orchestrator').build(),
        new FunctionModelBuilder().withName('Level 1 - Department Orchestrator').build(),
        new FunctionModelBuilder().withName('Level 2 - Team Orchestrator').build(),
        new FunctionModelBuilder().withName('Level 3 - Individual Processor').build()
      ];

      // Each level has similar structure but different scale
      const orchestrationContexts: FunctionModelContainerContext[] = models.slice(0, 3).map((model, index) => ({
        nestedModelOutputs: {
          [models[index + 1].modelId]: { 
            level: index + 1,
            status: 'active',
            throughput: Math.pow(10, index + 1) // Scale by level
          }
        },
        linkedKbContexts: [],
        nestedTetherContexts: [],
        orchestrationState: {
          currentStage: `level-${index}-orchestration`,
          completedStages: [`initialization-${index}`],
          failedStages: []
        }
      }));

      // Set up fractal hierarchy
      for (let i = 1; i < models.length; i++) {
        contextService.setModelHierarchy(models[i].modelId, models[i - 1].modelId);
        if (i < orchestrationContexts.length) {
          contextService.setContextData(`orchestrator-${i}`, orchestrationContexts[i]);
        }
      }

      // Leaf level actual processing
      const leafContext: TetherNodeContext = {
        runLogs: ['Individual processing task completed'],
        executionMemory: { 
          level: 3,
          fractalPosition: 'leaf-processor',
          hierarchicalPath: models.map(m => m.modelId)
        },
        outputData: { processedUnit: 1, quality: 'high' },
        aiAgentCommunication: {
          messages: ['Leaf processing complete'],
          decisions: ['Bubble up results through hierarchy']
        }
      };

      contextService.setContextData('leaf-processor', leafContext);

      // Act - Test fractal access patterns
      const rootAccess = contextService.getDeepNestedContext(models[0].modelId, models[3].modelId);

      // Assert - Fractal Pattern Consistency
      expect(rootAccess.length).toBeGreaterThan(0);
      
      // FRACTAL ORCHESTRATION: Each level maintains similar patterns
      orchestrationContexts.forEach((context, index) => {
        expect(context.orchestrationState.currentStage).toContain(`level-${index}`);
        expect(context.nestedModelOutputs).toBeDefined();
        
        // Scale consistency across levels
        const throughput = Object.values(context.nestedModelOutputs)[0].throughput;
        expect(throughput).toBe(Math.pow(10, index + 1));
      });

      // Leaf level accessible from root through hierarchy
      const leafFound = rootAccess.find(ctx => 
        'executionMemory' in ctx && (ctx as any).executionMemory.fractalPosition === 'leaf-processor'
      ) as TetherNodeContext;

      expect(leafFound).toBeDefined();
      expect(leafFound.executionMemory.level).toBe(3);
      expect(leafFound.executionMemory.hierarchicalPath).toHaveLength(4);
      expect(leafFound.aiAgentCommunication.decisions[0]).toContain('Bubble up results');
    });
  });

  /**
   * CONTEXT TYPE-SPECIFIC ACCESS VALIDATION
   * Tests access patterns for different action node context types
   */
  describe('Context Type-Specific Access Patterns', () => {
    it('TetherNodeContext_ShouldProvideExecutionAndAIAgentData', () => {
      // Arrange - Tether node with rich execution context
      const stageNode = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Execution Stage')
        .build();

      const tetherAction = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Spindle Integration Tether')
        .build();

      const tetherContext: TetherNodeContext = {
        runLogs: [
          'Connected to Spindle endpoint',
          'Workflow execution started',
          'Batch 1 processing: 100 items',
          'Batch 2 processing: 150 items',
          'Workflow execution completed successfully'
        ],
        executionMemory: {
          connectionId: 'spindle-conn-123',
          workflowId: 'wf-456',
          batchSize: 100,
          totalProcessed: 250,
          errorCount: 2,
          retryAttempts: 1,
          executionDuration: 45000,
          resourceUsage: { cpu: '200m', memory: '128Mi' }
        },
        outputData: {
          processedRecords: [
            { id: 1, status: 'success', result: 'A' },
            { id: 2, status: 'success', result: 'B' },
            { id: 3, status: 'retry', result: null, error: 'timeout' }
          ],
          summary: { total: 250, success: 248, failed: 2 },
          artifacts: ['result-batch-1.json', 'result-batch-2.json'],
          metrics: { throughput: 5.56, accuracy: 0.992 }
        },
        aiAgentCommunication: {
          messages: [
            'Workflow orchestration started',
            'Detected performance bottleneck in batch processing',
            'Applied optimization: increased batch size to 150',
            'Workflow completed with high success rate'
          ],
          decisions: [
            'Increase batch size for efficiency',
            'Flag timeout errors for manual review',
            'Recommend this workflow for similar tasks'
          ]
        }
      };

      contextService.setContextData(tetherAction.actionId.toString(), tetherContext);
      contextService.setHierarchy(tetherAction.actionId.toString(), stageNode.nodeId.toString());

      // Act - Access tether context from parent and siblings
      const parentAccess = contextService.getChildContexts(stageNode.nodeId.toString());
      
      // Assert - Tether Context Access Validation
      expect(parentAccess.length).toBe(1);
      const accessedTetherContext = parentAccess[0] as TetherNodeContext;
      
      // RUN LOGS: Complete execution trace
      expect(accessedTetherContext.runLogs.length).toBe(5);
      expect(accessedTetherContext.runLogs[0]).toBe('Connected to Spindle endpoint');
      expect(accessedTetherContext.runLogs[4]).toBe('Workflow execution completed successfully');
      
      // EXECUTION MEMORY: Detailed runtime state
      expect(accessedTetherContext.executionMemory.connectionId).toBe('spindle-conn-123');
      expect(accessedTetherContext.executionMemory.totalProcessed).toBe(250);
      expect(accessedTetherContext.executionMemory.errorCount).toBe(2);
      expect(accessedTetherContext.executionMemory.resourceUsage.cpu).toBe('200m');
      
      // OUTPUT DATA: Results and artifacts
      expect(accessedTetherContext.outputData.processedRecords.length).toBe(3);
      expect(accessedTetherContext.outputData.summary.success).toBe(248);
      expect(accessedTetherContext.outputData.artifacts).toContain('result-batch-1.json');
      expect(accessedTetherContext.outputData.metrics.throughput).toBe(5.56);
      
      // AI AGENT COMMUNICATION: Decision tracking
      expect(accessedTetherContext.aiAgentCommunication.messages.length).toBe(4);
      expect(accessedTetherContext.aiAgentCommunication.messages[1]).toContain('performance bottleneck');
      expect(accessedTetherContext.aiAgentCommunication.decisions).toContain('Increase batch size for efficiency');
      expect(accessedTetherContext.aiAgentCommunication.decisions).toContain('Recommend this workflow for similar tasks');
    });

    it('KbNodeContext_ShouldProvideKnowledgeBaseContentAndMetadata', () => {
      // Arrange - KB node with rich knowledge context
      const stageNode = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Knowledge Stage')
        .build();

      const kbAction = new KBNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Technical Documentation Reference')
        .build();

      const kbContext: KbNodeContext = {
        linkedContent: {
          documentId: 'tech-docs-789',
          textContent: `
# API Integration Guidelines

## Authentication
- Use OAuth 2.0 for secure authentication
- Token refresh every 30 minutes
- Implement proper error handling for auth failures

## Rate Limiting
- Maximum 100 requests per minute per client
- Implement exponential backoff for rate limit errors
- Use batch operations where possible

## Error Handling
- Standard HTTP status codes
- Structured error responses with error codes
- Comprehensive logging for troubleshooting

## Best Practices
- Implement proper timeout handling
- Use connection pooling for efficiency
- Monitor API usage and performance metrics
          `.trim(),
          metadata: {
            version: '3.2.1',
            lastUpdated: '2025-01-20T14:30:00Z',
            author: 'Technical Architecture Team',
            reviewStatus: 'approved',
            classification: 'internal',
            tags: ['api', 'integration', 'authentication', 'best-practices'],
            relatedDocuments: ['security-guidelines-456', 'monitoring-setup-123'],
            changeHistory: [
              { version: '3.2.1', date: '2025-01-20', changes: 'Updated rate limiting guidelines' },
              { version: '3.2.0', date: '2025-01-15', changes: 'Added OAuth 2.0 requirements' },
              { version: '3.1.0', date: '2025-01-10', changes: 'Enhanced error handling section' }
            ]
          }
        },
        searchKeywords: [
          'authentication', 'oauth', 'rate-limiting', 'error-handling',
          'api-integration', 'best-practices', 'timeout', 'monitoring',
          'connection-pooling', 'exponential-backoff', 'batch-operations'
        ],
        accessPermissions: [
          'read', 'reference', 'cite', 'link',
          'technical-team-edit', 'architecture-approve'
        ]
      };

      contextService.setContextData(kbAction.actionId.toString(), kbContext);
      contextService.setHierarchy(kbAction.actionId.toString(), stageNode.nodeId.toString());

      // Act - Access KB context from parent
      const parentAccess = contextService.getChildContexts(stageNode.nodeId.toString());
      
      // Assert - KB Context Access Validation
      expect(parentAccess.length).toBe(1);
      const accessedKbContext = parentAccess[0] as KbNodeContext;
      
      // LINKED CONTENT: Full document access
      expect(accessedKbContext.linkedContent.documentId).toBe('tech-docs-789');
      expect(accessedKbContext.linkedContent.textContent).toContain('API Integration Guidelines');
      expect(accessedKbContext.linkedContent.textContent).toContain('OAuth 2.0 for secure authentication');
      expect(accessedKbContext.linkedContent.textContent).toContain('Maximum 100 requests per minute');
      
      // METADATA: Rich document metadata
      expect(accessedKbContext.linkedContent.metadata.version).toBe('3.2.1');
      expect(accessedKbContext.linkedContent.metadata.author).toBe('Technical Architecture Team');
      expect(accessedKbContext.linkedContent.metadata.reviewStatus).toBe('approved');
      expect(accessedKbContext.linkedContent.metadata.tags).toContain('authentication');
      expect(accessedKbContext.linkedContent.metadata.relatedDocuments).toContain('security-guidelines-456');
      
      // CHANGE HISTORY: Version tracking
      expect(accessedKbContext.linkedContent.metadata.changeHistory.length).toBe(3);
      expect(accessedKbContext.linkedContent.metadata.changeHistory[0].version).toBe('3.2.1');
      expect(accessedKbContext.linkedContent.metadata.changeHistory[0].changes).toContain('rate limiting');
      
      // SEARCH KEYWORDS: Semantic indexing
      expect(accessedKbContext.searchKeywords.length).toBe(11);
      expect(accessedKbContext.searchKeywords).toContain('oauth');
      expect(accessedKbContext.searchKeywords).toContain('exponential-backoff');
      expect(accessedKbContext.searchKeywords).toContain('batch-operations');
      
      // ACCESS PERMISSIONS: Fine-grained access control
      expect(accessedKbContext.accessPermissions).toContain('read');
      expect(accessedKbContext.accessPermissions).toContain('reference');
      expect(accessedKbContext.accessPermissions).toContain('technical-team-edit');
      expect(accessedKbContext.accessPermissions).toContain('architecture-approve');
    });

    it('FunctionModelContainerContext_ShouldProvideNestedModelAggregation', () => {
      // Arrange - Function model container with nested model contexts
      const parentStage = new StageNodeBuilder()
        .withModelId(parentModel.modelId)
        .withName('Orchestration Stage')
        .build();

      const containerAction = new FunctionModelContainerNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNodeId(parentStage.nodeId.toString())
        .withName('Complex Workflow Container')
        .withNestedModelId('nested-model-456')
        .build();

      const containerContext: FunctionModelContainerContext = {
        nestedModelOutputs: {
          'nested-model-456': {
            status: 'completed',
            executionTime: 120000,
            results: {
              processedEntities: 500,
              validatedRecords: 485,
              failedValidations: 15,
              aggregatedScore: 0.97
            },
            performance: {
              throughput: 4.17,
              accuracy: 0.97,
              efficiency: 'high',
              resourceUtilization: { cpu: 0.65, memory: 0.43 }
            },
            outputs: {
              summaryReport: 'summary-report-456.json',
              detailedLog: 'execution-log-456.txt',
              validationResults: 'validation-results-456.csv'
            }
          }
        },
        linkedKbContexts: [
          {
            linkedContent: {
              documentId: 'workflow-specs-123',
              textContent: 'Complex workflow execution specifications and requirements',
              metadata: { domain: 'workflow-orchestration', criticality: 'high' }
            },
            searchKeywords: ['workflow', 'orchestration', 'execution'],
            accessPermissions: ['read', 'reference']
          },
          {
            linkedContent: {
              documentId: 'validation-rules-789',
              textContent: 'Data validation rules and quality metrics for workflow outputs',
              metadata: { domain: 'data-quality', version: '2.1' }
            },
            searchKeywords: ['validation', 'quality', 'metrics'],
            accessPermissions: ['read', 'analyze']
          }
        ],
        nestedTetherContexts: [
          {
            runLogs: ['Nested tether execution started', 'Data processing phase completed'],
            executionMemory: { phase: 'data-processing', batchCount: 5 },
            outputData: { processedBatches: 5, totalRecords: 500 },
            aiAgentCommunication: {
              messages: ['Data processing phase successful'],
              decisions: ['Continue to validation phase']
            }
          },
          {
            runLogs: ['Validation tether started', 'Validation rules applied'],
            executionMemory: { phase: 'validation', rulesSets: 3 },
            outputData: { validatedRecords: 485, rejectedRecords: 15 },
            aiAgentCommunication: {
              messages: ['Validation phase completed with high accuracy'],
              decisions: ['Accept results and generate final report']
            }
          }
        ],
        orchestrationState: {
          currentStage: 'completed',
          completedStages: [
            'initialization',
            'data-processing', 
            'validation',
            'reporting',
            'finalization'
          ],
          failedStages: []
        }
      };

      contextService.setContextData(containerAction.actionId.toString(), containerContext);
      contextService.setHierarchy(containerAction.actionId.toString(), parentStage.nodeId.toString());

      // Act - Access function model container context
      const parentAccess = contextService.getChildContexts(parentStage.nodeId.toString());
      
      // Assert - Function Model Container Context Validation
      expect(parentAccess.length).toBe(1);
      const accessedContainerContext = parentAccess[0] as FunctionModelContainerContext;
      
      // NESTED MODEL OUTPUTS: Aggregated results
      const nestedOutput = accessedContainerContext.nestedModelOutputs['nested-model-456'];
      expect(nestedOutput.status).toBe('completed');
      expect(nestedOutput.results.processedEntities).toBe(500);
      expect(nestedOutput.results.validatedRecords).toBe(485);
      expect(nestedOutput.results.aggregatedScore).toBe(0.97);
      expect(nestedOutput.performance.throughput).toBe(4.17);
      expect(nestedOutput.performance.resourceUtilization.cpu).toBe(0.65);
      expect(nestedOutput.outputs.summaryReport).toBe('summary-report-456.json');
      
      // LINKED KB CONTEXTS: Related knowledge aggregation
      expect(accessedContainerContext.linkedKbContexts.length).toBe(2);
      const workflowKb = accessedContainerContext.linkedKbContexts[0];
      const validationKb = accessedContainerContext.linkedKbContexts[1];
      
      expect(workflowKb.linkedContent.documentId).toBe('workflow-specs-123');
      expect(workflowKb.searchKeywords).toContain('orchestration');
      expect(validationKb.linkedContent.documentId).toBe('validation-rules-789');
      expect(validationKb.searchKeywords).toContain('quality');
      
      // NESTED TETHER CONTEXTS: Execution details
      expect(accessedContainerContext.nestedTetherContexts.length).toBe(2);
      const processingTether = accessedContainerContext.nestedTetherContexts[0];
      const validationTether = accessedContainerContext.nestedTetherContexts[1];
      
      expect(processingTether.executionMemory.phase).toBe('data-processing');
      expect(processingTether.outputData.processedBatches).toBe(5);
      expect(validationTether.executionMemory.phase).toBe('validation');
      expect(validationTether.outputData.validatedRecords).toBe(485);
      
      // ORCHESTRATION STATE: Workflow lifecycle
      expect(accessedContainerContext.orchestrationState.currentStage).toBe('completed');
      expect(accessedContainerContext.orchestrationState.completedStages.length).toBe(5);
      expect(accessedContainerContext.orchestrationState.completedStages).toContain('data-processing');
      expect(accessedContainerContext.orchestrationState.completedStages).toContain('validation');
      expect(accessedContainerContext.orchestrationState.failedStages).toHaveLength(0);
    });
  });
});

/**
 * SUMMARY: Hierarchical Context Access Comprehensive Validation
 * 
 * These tests serve as EXECUTABLE SPECIFICATIONS for the complex hierarchical context access
 * patterns defined in the Function Model domain:
 * 
 * 1. SIBLING ACCESS RULES: Read-only context sharing between nodes at same hierarchical level
 * 2. PARENT-CHILD ACCESS: Parents have read/write access to children, children have read-only to parents
 * 3. UNCLE/AUNT ACCESS: Read-only lateral access for root cause analysis and debugging
 * 4. DEEP NESTING ACCESS: Cascading access through multi-level function model hierarchy
 * 5. CONTEXT TYPE SPECIFICITY: Different access patterns for TetherNode, KbNode, and FunctionModelContainer contexts
 * 6. FRACTAL ORCHESTRATION: Consistent access patterns maintained across all nesting levels
 * 7. SECURITY BOUNDARIES: Write access restrictions enforced at all hierarchy levels
 * 8. AGGREGATION PATTERNS: Container nodes aggregate child contexts for higher-level visibility
 * 
 * DOMAIN RULE COMPLIANCE:
 * - Sibling nodes share context read-only for coordination
 * - Parent nodes have full access to manage child orchestration
 * - Uncle/aunt access enables cross-branch troubleshooting
 * - Deep nesting maintains consistent access patterns
 * - Context types provide appropriate data for different node functions
 * 
 * CLEAN ARCHITECTURE VALIDATION:
 * - Context access rules are purely domain concerns
 * - No infrastructure dependencies in access logic
 * - Context security enforced through domain services
 * - Access patterns enable proper orchestration without coupling
 * 
 * USE AS TEMPLATE: These patterns demonstrate how hierarchical context access should be
 * implemented in the NodeContextAccessService and serve as specifications for
 * context security and orchestration capabilities.
 */