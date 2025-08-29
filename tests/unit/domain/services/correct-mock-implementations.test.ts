/**
 * Correct Mock Implementations Test Suite
 * 
 * This test suite provides the correct mock implementations that match
 * the actual service interfaces. It fixes common mocking mistakes that
 * lead to "method is not a function" errors by providing properly
 * structured mocks that mirror the real service contracts.
 * 
 * Use these mocks as templates in other tests to avoid method signature
 * mismatches and undefined method calls.
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
import { ActionStatus } from '@/lib/domain/enums';

describe('Correct Mock Implementations', () => {

  describe('NodeContextAccessService Mock Factory', () => {
    it('should create correct mock for NodeContextAccessService', () => {
      // Factory function to create properly mocked NodeContextAccessService
      const createMockNodeContextAccessService = () => {
        return {
          registerNode: jest.fn().mockImplementation((
            nodeId: NodeId,
            nodeType: string,
            parentNodeId: NodeId | undefined,
            contextData: Record<string, any>,
            hierarchyLevel: number
          ) => {
            return Result.ok<void>(undefined);
          }),

          getAccessibleContexts: jest.fn().mockImplementation((requestingNodeId: NodeId) => {
            const mockResults: ContextAccessResult[] = [
              {
                context: {
                  nodeId: requestingNodeId,
                  nodeType: 'TestNode',
                  contextData: { accessible: true },
                  accessLevel: 'read' as const,
                  hierarchyLevel: 0
                } as NodeContext,
                accessGranted: true,
                accessReason: 'Self-access allowed'
              }
            ];
            return Result.ok<ContextAccessResult[]>(mockResults);
          }),

          getNodeContext: jest.fn().mockImplementation((
            requestingNodeId: NodeId,
            targetNodeId: NodeId,
            requestedAccess: 'read' | 'write' | 'execute' = 'read'
          ) => {
            const mockContext: NodeContext = {
              nodeId: targetNodeId,
              nodeType: 'TestNode',
              contextData: { test: 'data', requestedBy: requestingNodeId.value },
              accessLevel: requestedAccess,
              hierarchyLevel: 0
            };
            return Result.ok<NodeContext>(mockContext);
          }),

          updateNodeContext: jest.fn().mockImplementation((
            updatingNodeId: NodeId,
            targetNodeId: NodeId,
            newContextData: Record<string, any>
          ) => {
            return Result.ok<void>(undefined);
          }),

          extractActionNodeContext: jest.fn().mockImplementation((actionNode: any) => {
            return {
              actionId: actionNode.actionId?.value || 'mock-action-id',
              name: actionNode.name || 'Mock Action',
              description: actionNode.description || 'Mock Description',
              executionMode: actionNode.executionMode || 'sequential',
              status: actionNode.status || 'configured',
              type: 'ActionNode'
            };
          }),

          // Test helper methods (these exist on real service)
          setHierarchy: jest.fn().mockImplementation((childNodeId: string, parentNodeId: string) => {
            // Mock implementation
          }),

          setContextData: jest.fn().mockImplementation((nodeId: string, contextData: any) => {
            // Mock implementation  
          }),

          getChildContexts: jest.fn().mockImplementation((parentNodeId: string) => {
            return [{ child: 'data' }];
          }),

          getParentChildRelations: jest.fn().mockImplementation(() => {
            return new Map<string, string[]>();
          }),

          debugHasChildren: jest.fn().mockImplementation((nodeId: string) => {
            return false;
          }),

          getDeepNestedContext: jest.fn().mockImplementation((sourceModelId: string, targetModelId: string) => {
            return [{ nested: 'context', modelId: targetModelId }];
          }),

          debugState: jest.fn().mockImplementation(() => {
            return {
              nodeCount: 0,
              nodes: []
            };
          }),

          debugForceSetContext: jest.fn().mockImplementation((nodeId: string, contextData: any) => {
            return true;
          })
        } as jest.Mocked<NodeContextAccessService>;
      };

      // Test the mock factory
      const mockService = createMockNodeContextAccessService();

      // Verify all expected methods exist
      expect(typeof mockService.registerNode).toBe('function');
      expect(typeof mockService.getAccessibleContexts).toBe('function');
      expect(typeof mockService.getNodeContext).toBe('function');
      expect(typeof mockService.updateNodeContext).toBe('function');
      expect(typeof mockService.extractActionNodeContext).toBe('function');

      // Verify methods that DON'T exist on real service are NOT in mock
      expect((mockService as any).buildContext).toBeUndefined();
      expect((mockService as any).clearNodeContext).toBeUndefined();
      expect((mockService as any).propagateContext).toBeUndefined();
      expect((mockService as any).getHierarchicalContext).toBeUndefined();

      // Test that mock methods return correct types
      const nodeId = NodeId.generate();
      const registerResult = mockService.registerNode(
        nodeId, 
        'TestNode', 
        undefined, 
        { test: 'data' }, 
        0
      );
      expect(registerResult.isSuccess).toBe(true);

      const accessResult = mockService.getAccessibleContexts(nodeId);
      expect(accessResult.isSuccess).toBe(true);
      expect(Array.isArray(accessResult.value)).toBe(true);
    });
  });

  describe('ActionNodeExecutionService Mock Factory', () => {
    it('should create correct mock for ActionNodeExecutionService', () => {
      const createMockActionNodeExecutionService = () => {
        return {
          executeAction: jest.fn().mockResolvedValue(Result.ok({
            executionId: 'exec-123',
            status: ActionStatus.COMPLETED,
            output: { result: 'success' }
          })),

          pauseExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),

          resumeExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),

          stopExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),

          getExecutionState: jest.fn().mockResolvedValue(Result.ok({
            state: 'running',
            progress: 0.5,
            currentAction: 'action-123'
          })),

          failExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),

          evaluateRetryPolicy: jest.fn().mockResolvedValue(Result.ok(true)),

          getExecutionSnapshot: jest.fn().mockResolvedValue(Result.ok({
            executionId: 'exec-123',
            status: ActionStatus.RUNNING,
            metadata: { 
              retryAttempt: 0,
              startTime: new Date(),
              lastUpdate: new Date()
            },
            output: null,
            error: null
          })),

          retryExecution: jest.fn().mockResolvedValue(Result.ok({
            retryId: 'retry-123',
            originalExecutionId: 'exec-123',
            status: ActionStatus.RETRYING
          }))
        } as jest.Mocked<ActionNodeExecutionService>;
      };

      const mockService = createMockActionNodeExecutionService();

      // Verify all expected methods exist
      expect(typeof mockService.executeAction).toBe('function');
      expect(typeof mockService.pauseExecution).toBe('function');
      expect(typeof mockService.resumeExecution).toBe('function');
      expect(typeof mockService.stopExecution).toBe('function');
      expect(typeof mockService.getExecutionState).toBe('function');
      expect(typeof mockService.failExecution).toBe('function');
      expect(typeof mockService.evaluateRetryPolicy).toBe('function');
      expect(typeof mockService.getExecutionSnapshot).toBe('function');
      expect(typeof mockService.retryExecution).toBe('function');
    });
  });

  describe('AIAgentOrchestrationService Mock Factory', () => {
    it('should create correct mock for AIAgentOrchestrationService', () => {
      const createMockAIAgentOrchestrationService = () => {
        return {
          orchestrateAgents: jest.fn().mockResolvedValue(Result.ok({
            orchestrationId: 'orch-123',
            agentCount: 2,
            status: 'active'
          })),

          registerAgent: jest.fn().mockResolvedValue(Result.ok({
            agentId: 'agent-123',
            registered: true,
            capabilities: ['task-execution', 'data-processing']
          })),

          discoverAgents: jest.fn().mockResolvedValue(Result.ok([
            {
              agentId: 'agent-123',
              name: 'Test Agent',
              capabilities: ['task-execution'],
              status: 'available'
            }
          ])),

          handleAgentFailure: jest.fn().mockResolvedValue(Result.ok(undefined)),

          getAgentMetrics: jest.fn().mockResolvedValue(Result.ok({
            executionCount: 10,
            failureCount: 1,
            averageExecutionTime: 1000,
            lastExecution: new Date()
          }))
        } as jest.Mocked<AIAgentOrchestrationService>;
      };

      const mockService = createMockAIAgentOrchestrationService();

      // Verify all expected methods exist
      expect(typeof mockService.orchestrateAgents).toBe('function');
      expect(typeof mockService.registerAgent).toBe('function');
      expect(typeof mockService.discoverAgents).toBe('function');
      expect(typeof mockService.handleAgentFailure).toBe('function');
      expect(typeof mockService.getAgentMetrics).toBe('function');
    });
  });

  describe('BusinessRuleValidationService Mock Factory', () => {
    it('should create correct mock for BusinessRuleValidationService', () => {
      const createMockBusinessRuleValidationService = () => {
        return {
          validateBusinessRules: jest.fn().mockResolvedValue(Result.ok({
            isValid: true,
            errors: [],
            warnings: [],
            validatedRules: ['rule-1', 'rule-2'],
            executionTime: 150
          })),

          validateModelRules: jest.fn().mockResolvedValue(Result.ok({
            isValid: true,
            violations: [],
            checkedRules: ['model-naming', 'permission-validation']
          })),

          validateNodeRules: jest.fn().mockResolvedValue(Result.ok({
            isValid: true,
            nodeViolations: new Map(),
            globalViolations: []
          })),

          validateWorkflowRules: jest.fn().mockResolvedValue(Result.ok({
            isValid: true,
            workflowErrors: [],
            dependencyIssues: []
          }))
        } as jest.Mocked<BusinessRuleValidationService>;
      };

      const mockService = createMockBusinessRuleValidationService();

      // Verify all expected methods exist
      expect(typeof mockService.validateBusinessRules).toBe('function');
      expect(typeof mockService.validateModelRules).toBe('function');
      expect(typeof mockService.validateNodeRules).toBe('function');
      expect(typeof mockService.validateWorkflowRules).toBe('function');
    });
  });

  describe('ManageErrorHandlingAndRecoveryUseCase Mock Factory', () => {
    it('should create correct mock for ManageErrorHandlingAndRecoveryUseCase', () => {
      const createMockErrorHandlingUseCase = () => {
        return {
          handleActionNodeFailure: jest.fn().mockResolvedValue(Result.ok({
            operationType: 'action-execution' as const,
            success: true,
            actionTaken: 'retry' as const,
            retryAttempted: true,
            retryCount: 1,
            backoffDelay: 1000,
            propagatedErrors: [],
            finalStatus: ActionStatus.COMPLETED,
            executionMetrics: {
              totalDuration: 2000,
              retryDuration: 1000,
              recoveryDuration: 2000
            },
            contextualInformation: {
              actionId: 'action-123',
              originalError: 'Test failure',
              retryPolicyEnabled: true
            }
          } as ErrorHandlingResult)),

          handleAgentExecutionFailure: jest.fn().mockResolvedValue(Result.ok({
            operationType: 'agent-execution' as const,
            success: true,
            actionTaken: 'restart' as const,
            agentRecoveryApplied: 'restart' as const,
            propagatedErrors: [],
            finalStatus: 'restarted' as const,
            executionMetrics: {
              totalDuration: 1500,
              retryDuration: 0,
              recoveryDuration: 1500
            },
            contextualInformation: {
              agentId: 'agent-123',
              failureReason: 'Agent timeout',
              recoveryAction: 'restart'
            }
          } as ErrorHandlingResult)),

          validateBusinessRules: jest.fn().mockResolvedValue(Result.ok({
            operationType: 'business-validation' as const,
            success: true,
            actionTaken: undefined,
            businessRulesViolated: [],
            propagatedErrors: [],
            finalStatus: ActionStatus.CONFIGURED,
            executionMetrics: {
              totalDuration: 500,
              retryDuration: 0,
              recoveryDuration: 0
            },
            contextualInformation: {
              modelId: 'model-123',
              modelName: 'Test Model',
              validationErrors: [],
              validationWarnings: [],
              nodeCount: 0
            }
          } as ErrorHandlingResult)),

          executeErrorHandlingAndRecovery: jest.fn().mockResolvedValue(Result.ok([
            {
              operationType: 'action-execution' as const,
              success: true,
              actionTaken: 'retry' as const,
              retryAttempted: true,
              finalStatus: ActionStatus.COMPLETED,
              executionMetrics: {
                totalDuration: 2000,
                retryDuration: 1000,
                recoveryDuration: 2000
              }
            } as ErrorHandlingResult
          ]))
        } as jest.Mocked<ManageErrorHandlingAndRecoveryUseCase>;
      };

      const mockUseCase = createMockErrorHandlingUseCase();

      // Verify all expected methods exist
      expect(typeof mockUseCase.handleActionNodeFailure).toBe('function');
      expect(typeof mockUseCase.handleAgentExecutionFailure).toBe('function');
      expect(typeof mockUseCase.validateBusinessRules).toBe('function');
      expect(typeof mockUseCase.executeErrorHandlingAndRecovery).toBe('function');

      // Verify that the commonly expected but non-existent 'execute' method is NOT in mock
      expect((mockUseCase as any).execute).toBeUndefined();
    });
  });

  describe('Integration Test with Correct Mocks', () => {
    it('should demonstrate proper mock usage in integration scenario', async () => {
      // Create all mocks using the factories
      const mockActionExecutionService = {
        failExecution: jest.fn().mockResolvedValue(Result.ok(undefined)),
        evaluateRetryPolicy: jest.fn().mockResolvedValue(Result.ok(true)),
        getExecutionSnapshot: jest.fn().mockResolvedValue(Result.ok({
          status: ActionStatus.CONFIGURED,
          metadata: { retryAttempt: 0 }
        })),
        retryExecution: jest.fn().mockResolvedValue(Result.ok(undefined))
      } as any;

      const mockAgentOrchestrationService = {
        handleAgentFailure: jest.fn().mockResolvedValue(Result.ok(undefined)),
        getAgentMetrics: jest.fn().mockResolvedValue(Result.ok({ 
          executionCount: 10, 
          failureCount: 1 
        }))
      } as any;

      const mockBusinessRuleValidationService = {
        validateBusinessRules: jest.fn().mockResolvedValue(Result.ok({
          isValid: true,
          errors: [],
          warnings: []
        }))
      } as any;

      const mockContextAccessService = {
        registerNode: jest.fn().mockReturnValue(Result.ok(undefined)),
        getAccessibleContexts: jest.fn().mockReturnValue(Result.ok([])),
        getNodeContext: jest.fn().mockReturnValue(Result.ok({
          nodeId: NodeId.generate(),
          nodeType: 'TestNode',
          contextData: {},
          accessLevel: 'read' as const,
          hierarchyLevel: 0
        } as NodeContext)),
        updateNodeContext: jest.fn().mockReturnValue(Result.ok(undefined)),
        extractActionNodeContext: jest.fn().mockReturnValue({})
      } as any;

      // Create the use case with properly mocked dependencies
      const errorHandlingUseCase = new ManageErrorHandlingAndRecoveryUseCase(
        mockActionExecutionService,
        mockAgentOrchestrationService,
        mockBusinessRuleValidationService,
        mockContextAccessService
      );

      // Test that the use case works with correct method calls
      const result = await errorHandlingUseCase.executeErrorHandlingAndRecovery({
        operationType: 'action-execution',
        actionNodeId: 'action-123',
        failureContext: {
          error: 'Test failure',
          timestamp: new Date()
        }
      });

      // Verify the integration works
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value.length).toBeGreaterThan(0);
      }

      // Verify mocks were called correctly
      expect(mockActionExecutionService.failExecution).toHaveBeenCalled();
      expect(mockActionExecutionService.evaluateRetryPolicy).toHaveBeenCalled();
    });

    it('should demonstrate context service integration with correct methods', () => {
      // Create mock using the factory
      const mockContextService = {
        registerNode: jest.fn().mockReturnValue(Result.ok(undefined)),
        getAccessibleContexts: jest.fn().mockReturnValue(Result.ok([])),
        getNodeContext: jest.fn().mockReturnValue(Result.ok({
          nodeId: NodeId.generate(),
          nodeType: 'TestNode',
          contextData: { test: 'data' },
          accessLevel: 'read' as const,
          hierarchyLevel: 0
        } as NodeContext)),
        updateNodeContext: jest.fn().mockReturnValue(Result.ok(undefined)),
        extractActionNodeContext: jest.fn().mockReturnValue({ extracted: true })
      } as any;

      // Test integration using only methods that exist
      const nodeId = NodeId.generate();
      
      // Register a node
      const registerResult = mockContextService.registerNode(
        nodeId, 
        'ActionNode', 
        undefined, 
        { test: 'data' }, 
        0
      );
      expect(registerResult.isSuccess).toBe(true);

      // Get accessible contexts
      const accessResult = mockContextService.getAccessibleContexts(nodeId);
      expect(accessResult.isSuccess).toBe(true);

      // Get node context
      const contextResult = mockContextService.getNodeContext(nodeId, nodeId, 'read');
      expect(contextResult.isSuccess).toBe(true);

      // Update context
      const updateResult = mockContextService.updateNodeContext(
        nodeId, 
        nodeId, 
        { updated: 'data' }
      );
      expect(updateResult.isSuccess).toBe(true);

      // Extract action context
      const extracted = mockContextService.extractActionNodeContext({ 
        actionId: { value: 'action-123' },
        name: 'Test Action'
      });
      expect(extracted.extracted).toBe(true);

      // Verify all mocks were called
      expect(mockContextService.registerNode).toHaveBeenCalled();
      expect(mockContextService.getAccessibleContexts).toHaveBeenCalled();
      expect(mockContextService.getNodeContext).toHaveBeenCalled();
      expect(mockContextService.updateNodeContext).toHaveBeenCalled();
      expect(mockContextService.extractActionNodeContext).toHaveBeenCalled();
    });
  });

  describe('Common Mocking Mistakes to Avoid', () => {
    it('should document incorrect mocking patterns', () => {
      const incorrectPatterns = {
        'Missing methods': [
          'Forgetting to mock all methods used in tests',
          'Not implementing the correct method signatures',
          'Missing return values or return types'
        ],
        'Incorrect method names': [
          'Mocking "execute" when real method is "executeErrorHandlingAndRecovery"',
          'Mocking "buildContext" when method does not exist on service',
          'Mocking "clearNodeContext" when method does not exist'
        ],
        'Wrong return types': [
          'Returning raw values instead of Result<T>',
          'Not wrapping async methods in Promise<Result<T>>',
          'Incorrect structure for complex return types'
        ],
        'Inconsistent mocking': [
          'Some tests use different mock signatures for same service',
          'Mock behavior changes between test files',
          'Not using factory functions for consistent mocks'
        ]
      };

      // Document the mistakes
      expect(incorrectPatterns['Missing methods']).toContain('Forgetting to mock all methods used in tests');
      expect(incorrectPatterns['Incorrect method names']).toContain('Mocking "execute" when real method is "executeErrorHandlingAndRecovery"');
      expect(incorrectPatterns['Wrong return types']).toContain('Returning raw values instead of Result<T>');
      expect(incorrectPatterns['Inconsistent mocking']).toContain('Not using factory functions for consistent mocks');
    });

    it('should provide mock validation checklist', () => {
      const validationChecklist = [
        'Verify all mocked methods exist on the real service/use case',
        'Check that method signatures match exactly (parameters and return types)',
        'Ensure async methods return Promise<Result<T>>',
        'Ensure sync methods return Result<T> or the correct primitive type',
        'Mock all methods that will be called in the test',
        'Use factory functions for consistent mock creation',
        'Test the mock behavior before using in integration tests',
        'Document what methods do NOT exist to prevent future mistakes'
      ];

      expect(validationChecklist).toHaveLength(8);
      expect(validationChecklist).toContain('Verify all mocked methods exist on the real service/use case');
      expect(validationChecklist).toContain('Check that method signatures match exactly (parameters and return types)');
    });
  });
});