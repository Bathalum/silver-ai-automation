/**
 * Service Method Signature Compliance Tests
 * 
 * This test suite defines the correct contracts for all domain services
 * and use cases, ensuring that interface expectations match implementations.
 * These tests act as architectural boundary filters to catch method signature
 * mismatches that cause runtime TypeErrors.
 * 
 * Critical Issues Addressed:
 * - Use case methods not matching test expectations
 * - Service method names different than what consumers expect  
 * - Missing method implementations on actual services
 * - Mock objects incomplete or incorrectly structured
 */

import { 
  NodeContextAccessService,
  NodeContext,
  ContextAccessResult
} from '@/lib/domain/services/node-context-access-service';

import {
  ManageErrorHandlingAndRecoveryUseCase,
  ErrorHandlingRequest,
  ErrorHandlingResult
} from '@/lib/use-cases/function-model/manage-error-handling-and-recovery-use-case';

import { 
  ActionNodeExecutionService 
} from '@/lib/domain/services/action-node-execution-service';

import { 
  AIAgentOrchestrationService 
} from '@/lib/domain/services/ai-agent-orchestration-service';

import { 
  BusinessRuleValidationService 
} from '@/lib/domain/services/business-rule-validation-service';

import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Result } from '@/lib/domain/shared/result';
import { ActionNode } from '@/lib/domain/entities/action-node';
import { FunctionModel } from '@/lib/domain/entities/function-model';

describe('Service Method Signature Compliance', () => {
  
  describe('NodeContextAccessService Contract Compliance', () => {
    let contextService: NodeContextAccessService;

    beforeEach(() => {
      contextService = new NodeContextAccessService();
    });

    it('should have registerNode method with correct signature', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const nodeType = 'ActionNode';
      const parentNodeId = NodeId.generate();
      const contextData = { test: 'data' };
      const hierarchyLevel = 1;

      // Act & Assert - Method exists and has correct signature
      expect(typeof contextService.registerNode).toBe('function');
      const result = contextService.registerNode(
        nodeId, 
        nodeType, 
        parentNodeId, 
        contextData, 
        hierarchyLevel
      );

      // Verify return type is Result<void>
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.isSuccess).toBe('boolean');
      expect(typeof result.isFailure).toBe('boolean');
    });

    it('should have getAccessibleContexts method with correct signature', () => {
      // Arrange
      const nodeId = NodeId.generate();
      
      // Register node first
      contextService.registerNode(nodeId, 'TestNode', undefined, { data: 'test' }, 0);

      // Act & Assert - Method exists and has correct signature
      expect(typeof contextService.getAccessibleContexts).toBe('function');
      const result = contextService.getAccessibleContexts(nodeId);

      // Verify return type is Result<ContextAccessResult[]>
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.isSuccess).toBe('boolean');
      expect(typeof result.isFailure).toBe('boolean');
      
      if (result.isSuccess) {
        expect(Array.isArray(result.value)).toBe(true);
        // Each item should be ContextAccessResult
        result.value.forEach(item => {
          expect(item).toHaveProperty('context');
          expect(item).toHaveProperty('accessGranted');
          expect(item).toHaveProperty('accessReason');
        });
      }
    });

    it('should have getNodeContext method with correct signature', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const targetNodeId = NodeId.generate();
      
      // Register nodes first
      contextService.registerNode(nodeId, 'TestNode', undefined, { data: 'test' }, 0);
      contextService.registerNode(targetNodeId, 'TargetNode', undefined, { target: 'data' }, 0);

      // Act & Assert - Method exists and has correct signature
      expect(typeof contextService.getNodeContext).toBe('function');
      const result = contextService.getNodeContext(nodeId, targetNodeId, 'read');

      // Verify return type is Result<NodeContext>
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.isSuccess).toBe('boolean');
      expect(typeof result.isFailure).toBe('boolean');
    });

    it('should have updateNodeContext method with correct signature', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const targetNodeId = NodeId.generate();
      const newData = { updated: 'data' };
      
      // Register nodes first
      contextService.registerNode(nodeId, 'TestNode', undefined, { data: 'test' }, 0);
      contextService.registerNode(targetNodeId, 'TargetNode', undefined, { target: 'data' }, 0);

      // Act & Assert - Method exists and has correct signature
      expect(typeof contextService.updateNodeContext).toBe('function');
      const result = contextService.updateNodeContext(nodeId, targetNodeId, newData);

      // Verify return type is Result<void>
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.isSuccess).toBe('boolean');
      expect(typeof result.isFailure).toBe('boolean');
    });

    it('should have extractActionNodeContext method with correct signature', () => {
      // Arrange
      const mockActionNode = {
        actionId: { value: 'action-123' },
        name: 'Test Action',
        description: 'Test Description',
        executionMode: 'sequential',
        status: 'configured',
        priority: 1,
        raci: { responsible: 'user1' }
      } as ActionNode;

      // Act & Assert - Method exists and has correct signature
      expect(typeof contextService.extractActionNodeContext).toBe('function');
      const result = contextService.extractActionNodeContext(mockActionNode);

      // Verify return type is Record<string, any>
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(result.actionId).toBeDefined();
      expect(result.name).toBeDefined();
    });

    it('should have buildContext method with correct signature', () => {
      expect(typeof contextService.buildContext).toBe('function');
      
      // Test method signature
      const nodeId = NodeId.generate();
      const data = { test: 'data' };
      const scope = 'execution' as const;
      const result = contextService.buildContext(nodeId, data, scope);
      
      expect(result).toBeDefined();
      expect(result.isSuccess || result.isFailure).toBe(true);
    });

    it('should have clearNodeContext method with correct signature', () => {
      expect(typeof contextService.clearNodeContext).toBe('function');
      
      // Test method signature
      const nodeId = NodeId.generate();
      const result = contextService.clearNodeContext(nodeId);
      
      expect(result).toBeDefined();
      expect(result.isSuccess || result.isFailure).toBe(true);
    });

    it('should have propagateContext method with correct signature', () => {
      expect(typeof contextService.propagateContext).toBe('function');
      
      // Test method signature - this method requires setup so we just test the function exists
      expect(typeof contextService.propagateContext).toBe('function');
    });

    it('should have getHierarchicalContext method with correct signature', () => {
      expect(typeof contextService.getHierarchicalContext).toBe('function');
      
      // Test method signature
      const nodeId = NodeId.generate();
      const result = contextService.getHierarchicalContext(nodeId);
      
      expect(result).toBeDefined();
      expect(result.isSuccess || result.isFailure).toBe(true);
    });
  });

  describe('ManageErrorHandlingAndRecoveryUseCase Contract Compliance', () => {
    let errorHandlingUseCase: ManageErrorHandlingAndRecoveryUseCase;
    let mockActionExecutionService: jest.Mocked<ActionNodeExecutionService>;
    let mockAgentOrchestrationService: jest.Mocked<AIAgentOrchestrationService>;
    let mockBusinessRuleValidationService: jest.Mocked<BusinessRuleValidationService>;
    let mockContextAccessService: jest.Mocked<NodeContextAccessService>;

    beforeEach(() => {
      // Create properly mocked services with correct method signatures
      mockActionExecutionService = {
        failExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),
        evaluateRetryPolicy: jest.fn().mockResolvedValue(Result.ok(true)),
        getExecutionSnapshot: jest.fn().mockResolvedValue(Result.ok({
          status: 'configured',
          metadata: { retryAttempt: 0 }
        })),
        retryExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),
        executeAction: jest.fn().mockResolvedValue(Result.ok(undefined)),
        pauseExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),
        resumeExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),
        stopExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),
        getExecutionState: jest.fn().mockResolvedValue(Result.ok({ state: 'running' }))
      } as any;

      mockAgentOrchestrationService = {
        handleAgentFailure: jest.fn().mockResolvedValue(Result.ok(undefined)),
        getAgentMetrics: jest.fn().mockResolvedValue(Result.ok({ 
          executionCount: 10, 
          failureCount: 1 
        })),
        orchestrateAgents: jest.fn().mockResolvedValue(Result.ok(undefined)),
        registerAgent: jest.fn().mockResolvedValue(Result.ok(undefined)),
        discoverAgents: jest.fn().mockResolvedValue(Result.ok([]))
      } as any;

      mockBusinessRuleValidationService = {
        validateBusinessRules: jest.fn().mockResolvedValue(Result.ok({
          isValid: true,
          errors: [],
          warnings: []
        })),
        validateModelRules: jest.fn().mockResolvedValue(Result.ok({ isValid: true })),
        validateNodeRules: jest.fn().mockResolvedValue(Result.ok({ isValid: true })),
        validateWorkflowRules: jest.fn().mockResolvedValue(Result.ok({ isValid: true }))
      } as any;

      mockContextAccessService = {
        registerNode: jest.fn().mockReturnValue(Result.ok(undefined)),
        getAccessibleContexts: jest.fn().mockReturnValue(Result.ok([])),
        getNodeContext: jest.fn().mockReturnValue(Result.ok({} as NodeContext)),
        updateNodeContext: jest.fn().mockReturnValue(Result.ok(undefined)),
        extractActionNodeContext: jest.fn().mockReturnValue({})
      } as any;

      errorHandlingUseCase = new ManageErrorHandlingAndRecoveryUseCase(
        mockActionExecutionService,
        mockAgentOrchestrationService,
        mockBusinessRuleValidationService,
        mockContextAccessService
      );
    });

    it('should have handleActionNodeFailure method with correct signature', async () => {
      // Act & Assert - Method exists and has correct signature
      expect(typeof errorHandlingUseCase.handleActionNodeFailure).toBe('function');
      
      const result = await errorHandlingUseCase.handleActionNodeFailure(
        'action-123',
        'Test failure',
        undefined // retryPolicy optional
      );

      // Verify return type is Promise<Result<ErrorHandlingResult>>
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.isSuccess).toBe('boolean');
      expect(typeof result.isFailure).toBe('boolean');
      
      if (result.isSuccess) {
        expect(result.value).toHaveProperty('operationType');
        expect(result.value).toHaveProperty('success');
        expect(result.value.operationType).toBe('action-execution');
      }
    });

    it('should have handleAgentExecutionFailure method with correct signature', async () => {
      // Arrange
      const agentId = NodeId.generate();

      // Act & Assert - Method exists and has correct signature
      expect(typeof errorHandlingUseCase.handleAgentExecutionFailure).toBe('function');
      
      const result = await errorHandlingUseCase.handleAgentExecutionFailure(
        agentId,
        'Agent timeout failure',
        'retry'
      );

      // Verify return type is Promise<Result<ErrorHandlingResult>>
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.isSuccess).toBe('boolean');
      expect(typeof result.isFailure).toBe('boolean');
      
      if (result.isSuccess) {
        expect(result.value).toHaveProperty('operationType');
        expect(result.value).toHaveProperty('success');
        expect(result.value.operationType).toBe('agent-execution');
      }
    });

    it('should have validateBusinessRules method with correct signature', async () => {
      // Arrange
      const mockModel = {
        id: { value: 'model-123' },
        name: { toString: () => 'Test Model' }
      } as FunctionModel;
      
      const mockActionNodes: ActionNode[] = [];

      // Act & Assert - Method exists and has correct signature
      expect(typeof errorHandlingUseCase.validateBusinessRules).toBe('function');
      
      const result = await errorHandlingUseCase.validateBusinessRules(mockModel, mockActionNodes);

      // Verify return type is Promise<Result<ErrorHandlingResult>>
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.isSuccess).toBe('boolean');
      expect(typeof result.isFailure).toBe('boolean');
      
      if (result.isSuccess) {
        expect(result.value).toHaveProperty('operationType');
        expect(result.value).toHaveProperty('success');
        expect(result.value.operationType).toBe('business-validation');
      }
    });

    it('should have executeErrorHandlingAndRecovery method with correct signature', async () => {
      // Arrange
      const request: ErrorHandlingRequest = {
        operationType: 'action-execution',
        actionNodeId: 'action-123',
        failureContext: {
          error: 'Test failure',
          timestamp: new Date(),
          attemptCount: 1
        }
      };

      // Act & Assert - Method exists and has correct signature
      expect(typeof errorHandlingUseCase.executeErrorHandlingAndRecovery).toBe('function');
      
      const result = await errorHandlingUseCase.executeErrorHandlingAndRecovery(request);

      // Verify return type is Promise<Result<ErrorHandlingResult[]>>
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.isSuccess).toBe('boolean');
      expect(typeof result.isFailure).toBe('boolean');
      
      if (result.isSuccess) {
        expect(Array.isArray(result.value)).toBe(true);
        if (result.value.length > 0) {
          expect(result.value[0]).toHaveProperty('operationType');
          expect(result.value[0]).toHaveProperty('success');
        }
      }
    });

    it('should NOT have execute method (commonly expected but non-existent)', () => {
      // This test documents that execute does not exist on this use case
      // The test should use executeErrorHandlingAndRecovery instead
      expect(typeof (errorHandlingUseCase as any).execute).toBe('undefined');
    });
  });

  describe('Mock Object Structure Compliance', () => {
    it('should define proper mock structure for NodeContextAccessService', () => {
      // This test defines the expected mock structure for tests
      const mockContextService = {
        registerNode: jest.fn().mockReturnValue(Result.ok(undefined)),
        getAccessibleContexts: jest.fn().mockReturnValue(Result.ok([])),
        getNodeContext: jest.fn().mockReturnValue(Result.ok({
          nodeId: NodeId.generate(),
          nodeType: 'TestNode',
          contextData: {},
          accessLevel: 'read',
          hierarchyLevel: 0
        } as NodeContext)),
        updateNodeContext: jest.fn().mockReturnValue(Result.ok(undefined)),
        extractActionNodeContext: jest.fn().mockReturnValue({}),
        // These methods now exist on the real service
        buildContext: jest.fn().mockReturnValue(Result.ok({
          contextId: 'ctx-123',
          nodeId: NodeId.generate(),
          scope: 'execution',
          data: {},
          accessLevel: 'read-write',
          parentContextId: null
        })),
        clearNodeContext: jest.fn().mockReturnValue(Result.ok(undefined)),
        propagateContext: jest.fn().mockReturnValue(Result.ok({
          contextId: 'ctx-propagated',
          nodeId: NodeId.generate(),
          scope: 'execution',
          data: {},
          accessLevel: 'read-write',
          parentContextId: null
        })),
        getHierarchicalContext: jest.fn().mockReturnValue(Result.ok({
          contextId: 'ctx-hierarchy',
          nodeId: NodeId.generate(),
          scope: 'execution',
          data: {},
          accessLevel: 'read-write',
          parentContextId: null,
          childContextIds: [],
          timestamp: new Date().toISOString()
        }))
      };

      // Verify mock structure matches expectations
      expect(typeof mockContextService.registerNode).toBe('function');
      expect(typeof mockContextService.getAccessibleContexts).toBe('function');
      expect(typeof mockContextService.getNodeContext).toBe('function');
      expect(typeof mockContextService.updateNodeContext).toBe('function');
      expect(typeof mockContextService.extractActionNodeContext).toBe('function');
      
      // Verify the new methods are properly mocked
      expect(typeof mockContextService.buildContext).toBe('function');
      expect(typeof mockContextService.clearNodeContext).toBe('function');
      expect(typeof mockContextService.propagateContext).toBe('function');
      expect(typeof mockContextService.getHierarchicalContext).toBe('function');
    });

    it('should define proper mock structure for ManageErrorHandlingAndRecoveryUseCase', () => {
      // This test defines the expected mock structure for tests
      const mockErrorHandlingUseCase = {
        handleActionNodeFailure: jest.fn().mockResolvedValue(Result.ok({
          operationType: 'action-execution',
          success: true,
          actionTaken: 'retry'
        } as ErrorHandlingResult)),
        handleAgentExecutionFailure: jest.fn().mockResolvedValue(Result.ok({
          operationType: 'agent-execution',
          success: true,
          agentRecoveryApplied: 'restart'
        } as ErrorHandlingResult)),
        validateBusinessRules: jest.fn().mockResolvedValue(Result.ok({
          operationType: 'business-validation',
          success: true
        } as ErrorHandlingResult)),
        executeErrorHandlingAndRecovery: jest.fn().mockResolvedValue(Result.ok([{
          operationType: 'action-execution',
          success: true
        }] as ErrorHandlingResult[])),
        // This method doesn't exist on the real use case
        execute: undefined
      };

      // Verify mock structure matches expectations
      expect(typeof mockErrorHandlingUseCase.handleActionNodeFailure).toBe('function');
      expect(typeof mockErrorHandlingUseCase.handleAgentExecutionFailure).toBe('function');
      expect(typeof mockErrorHandlingUseCase.validateBusinessRules).toBe('function');
      expect(typeof mockErrorHandlingUseCase.executeErrorHandlingAndRecovery).toBe('function');
      
      // Verify commonly expected but non-existent method is undefined
      expect(mockErrorHandlingUseCase.execute).toBeUndefined();
    });
  });

  describe('Service Method Call Pattern Documentation', () => {
    it('should document correct way to call NodeContextAccessService methods', () => {
      // This test serves as documentation for proper method calls
      const contextService = new NodeContextAccessService();
      const nodeId = NodeId.generate();
      
      // CORRECT: Use registerNode to add nodes to the service
      const registerResult = contextService.registerNode(
        nodeId, 
        'ActionNode', 
        undefined, 
        { data: 'test' }, 
        0
      );
      expect(registerResult.isSuccess).toBe(true);

      // CORRECT: Use getAccessibleContexts to get context access results
      const accessResult = contextService.getAccessibleContexts(nodeId);
      expect(accessResult.isSuccess).toBe(true);

      // CORRECT: Use buildContext to create contexts
      const buildResult = contextService.buildContext(nodeId, { data: 'test' }, 'execution');
      expect(buildResult.isSuccess).toBe(true);

      // CORRECT: Use clearNodeContext to clear contexts
      const clearResult = contextService.clearNodeContext(nodeId);
      expect(clearResult.isSuccess).toBe(true);
    });

    it('should document correct way to call ManageErrorHandlingAndRecoveryUseCase methods', async () => {
      // This test serves as documentation for proper use case method calls
      const mockServices = {
        actionExecutionService: {
          failExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),
          evaluateRetryPolicy: jest.fn().mockResolvedValue(Result.ok(true)),
          getExecutionSnapshot: jest.fn().mockResolvedValue(Result.ok({
            status: 'configured',
            metadata: { retryAttempt: 0 }
          })),
          retryExecution: jest.fn().mockResolvedValue(Result.ok(undefined))
        } as any,
        agentOrchestrationService: {
          handleAgentFailure: jest.fn().mockResolvedValue(Result.ok(undefined)),
          getAgentMetrics: jest.fn().mockResolvedValue(Result.ok({ 
            executionCount: 10, 
            failureCount: 1 
          }))
        } as any,
        businessRuleValidationService: {
          validateBusinessRules: jest.fn().mockResolvedValue(Result.ok({
            isValid: true,
            errors: [],
            warnings: []
          }))
        } as any,
        contextAccessService: new NodeContextAccessService()
      };

      const errorHandlingUseCase = new ManageErrorHandlingAndRecoveryUseCase(
        mockServices.actionExecutionService,
        mockServices.agentOrchestrationService,
        mockServices.businessRuleValidationService,
        mockServices.contextAccessService
      );

      // CORRECT: Use executeErrorHandlingAndRecovery for comprehensive error handling
      const comprehensiveResult = await errorHandlingUseCase.executeErrorHandlingAndRecovery({
        operationType: 'action-execution',
        actionNodeId: 'action-123',
        failureContext: {
          error: 'Test failure',
          timestamp: new Date()
        }
      });
      expect(comprehensiveResult.isSuccess).toBe(true);

      // CORRECT: Use specific methods for targeted error handling
      const actionResult = await errorHandlingUseCase.handleActionNodeFailure(
        'action-123',
        'Specific action failure'
      );
      expect(actionResult.isSuccess).toBe(true);

      const agentResult = await errorHandlingUseCase.handleAgentExecutionFailure(
        NodeId.generate(),
        'Agent timeout',
        'retry'
      );
      expect(agentResult.isSuccess).toBe(true);

      // INCORRECT PATTERNS (these will fail):
      // errorHandlingUseCase.execute(...) // Method does not exist
      // Use executeErrorHandlingAndRecovery instead
    });
  });
});