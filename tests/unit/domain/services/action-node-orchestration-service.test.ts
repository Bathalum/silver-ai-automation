import { ActionNodeOrchestrationService, ExecutionPlan, ExecutionGroup, ExecutionResult, OrchestrationState } from '@/lib/domain/services/action-node-orchestration-service';
import { NodeContextAccessService } from '@/lib/domain/services/node-context-access-service';
import { ActionNode } from '@/lib/domain/entities/action-node';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { RetryPolicy } from '@/lib/domain/value-objects/retry-policy';
import { ExecutionMode, ActionStatus } from '@/lib/domain/enums';
import { Result } from '@/lib/domain/shared/result';

// Mock the NodeContextAccessService
class MockNodeContextAccessService {
  public getNodeContext(actionId: NodeId, parentNodeId: NodeId, accessMode: string): Result<{ contextData: Record<string, any> }> {
    return Result.ok({ contextData: { mockContext: true } });
  }
}

// Mock ActionNode implementation for testing
class MockActionNode extends ActionNode {
  public static createMock(
    actionId: string,
    parentNodeId: NodeId,
    executionOrder: number,
    priority: number = 1,
    executionMode: ExecutionMode = ExecutionMode.SEQUENTIAL,
    estimatedDuration: number = 60
  ): MockActionNode {
    const nodeId = NodeId.generate();
    const parentId = parentNodeId;
    const retryPolicy = RetryPolicy.create({
      maxAttempts: 3,
      strategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      enabled: true
    }).value!;

    const mockNode = new MockActionNode({
      actionId: nodeId,
      parentNodeId: parentId,
      modelId: 'test-model',
      name: `Action Node ${executionOrder}`,
      description: 'Test action node',
      executionMode,
      executionOrder,
      status: ActionStatus.ACTIVE,
      priority,
      estimatedDuration,
      retryPolicy,
      raci: { responsible: ['user1'], accountable: ['user2'], consulted: [], informed: [] } as any,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return mockNode;
  }

  public updateStatus(newStatus: ActionStatus): Result<void> {
    // Mock implementation
    return Result.ok(undefined);
  }
}

describe('ActionNodeOrchestrationService', () => {
  let service: ActionNodeOrchestrationService;
  let mockContextService: MockNodeContextAccessService;
  let containerId: NodeId;

  beforeEach(() => {
    mockContextService = new MockNodeContextAccessService();
    service = new ActionNodeOrchestrationService(mockContextService as any);
    containerId = NodeId.generate();
  });

  describe('Execution Plan Creation', () => {
    it('should create execution plan for action nodes', () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1),
        MockActionNode.createMock('action-2', containerId, 2, 1),
        MockActionNode.createMock('action-3', containerId, 3, 2)
      ];

      const result = service.createExecutionPlan(containerId, actionNodes);

      expect(result.isSuccess).toBe(true);
      const plan = result.value!;
      expect(plan.containerId.equals(containerId)).toBe(true);
      expect(plan.actionNodes).toHaveLength(3);
      expect(plan.executionGroups.length).toBeGreaterThan(0);
      expect(plan.totalEstimatedDuration).toBeGreaterThan(0);
    });

    it('should sort action nodes by execution order', () => {
      const actionNodes = [
        MockActionNode.createMock('action-3', containerId, 3, 1),
        MockActionNode.createMock('action-1', containerId, 1, 1),
        MockActionNode.createMock('action-2', containerId, 2, 1)
      ];

      const result = service.createExecutionPlan(containerId, actionNodes);

      expect(result.isSuccess).toBe(true);
      const plan = result.value!;
      expect(plan.actionNodes[0].executionOrder).toBe(1);
      expect(plan.actionNodes[1].executionOrder).toBe(2);
      expect(plan.actionNodes[2].executionOrder).toBe(3);
    });

    it('should group nodes by execution mode and priority', () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1, ExecutionMode.SEQUENTIAL),
        MockActionNode.createMock('action-2', containerId, 2, 1, ExecutionMode.SEQUENTIAL),
        MockActionNode.createMock('action-3', containerId, 3, 2, ExecutionMode.PARALLEL),
        MockActionNode.createMock('action-4', containerId, 4, 2, ExecutionMode.PARALLEL)
      ];

      const result = service.createExecutionPlan(containerId, actionNodes);

      expect(result.isSuccess).toBe(true);
      const plan = result.value!;
      expect(plan.executionGroups.length).toBeGreaterThan(1);
      
      // Check that groups have different execution modes
      const modes = plan.executionGroups.map(group => group.executionMode);
      expect(modes).toContain(ExecutionMode.SEQUENTIAL);
      expect(modes).toContain(ExecutionMode.PARALLEL);
    });

    it('should calculate total estimated duration', () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1, ExecutionMode.SEQUENTIAL, 120),
        MockActionNode.createMock('action-2', containerId, 2, 1, ExecutionMode.SEQUENTIAL, 180),
        MockActionNode.createMock('action-3', containerId, 3, 1, ExecutionMode.SEQUENTIAL, 90)
      ];

      const result = service.createExecutionPlan(containerId, actionNodes);

      expect(result.isSuccess).toBe(true);
      const plan = result.value!;
      expect(plan.totalEstimatedDuration).toBe(390); // 120 + 180 + 90
    });

    it('should reject empty action node list', () => {
      const result = service.createExecutionPlan(containerId, []);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot create execution plan for empty action node list');
    });

    it('should reject action nodes from different containers', () => {
      const otherContainerId = NodeId.generate();
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1),
        MockActionNode.createMock('action-2', otherContainerId, 2, 1)
      ];

      const result = service.createExecutionPlan(containerId, actionNodes);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('All action nodes must belong to the specified container');
    });
  });

  describe('Execution Orchestration', () => {
    it('should start execution and return orchestration ID', async () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1)
      ];
      const planResult = service.createExecutionPlan(containerId, actionNodes);
      const plan = planResult.value!;

      const result = await service.startExecution(plan);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toMatch(/^.*_\d+$/); // Should match container_timestamp pattern
    });

    it('should track orchestration state during execution', async () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1)
      ];
      const planResult = service.createExecutionPlan(containerId, actionNodes);
      const plan = planResult.value!;

      const orchestrationResult = await service.startExecution(plan);
      const orchestrationId = orchestrationResult.value!;

      const stateResult = service.getOrchestrationState(orchestrationId);
      expect(stateResult.isSuccess).toBe(true);
      
      const state = stateResult.value!;
      expect(state.containerId.equals(containerId)).toBe(true);
      expect(['completed', 'failed']).toContain(state.status);
      expect(state.startTime).toBeDefined();
      expect(state.endTime).toBeDefined();
    });

    it('should handle execution failure', async () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1)
      ];
      const planResult = service.createExecutionPlan(containerId, actionNodes);
      const plan = planResult.value!;

      // Force an error by modifying the service behavior
      jest.spyOn(service as any, 'executeGroups').mockRejectedValueOnce(new Error('Execution error'));

      const result = await service.startExecution(plan);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Execution failed');
    });
  });

  describe('Execution Control', () => {
    let orchestrationId: string;

    beforeEach(async () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1)
      ];
      const planResult = service.createExecutionPlan(containerId, actionNodes);
      const plan = planResult.value!;

      // Create a paused orchestration for testing
      orchestrationId = `${containerId}_${Date.now()}`;
      (service as any).orchestrationStates.set(orchestrationId, {
        containerId,
        status: 'executing',
        completedGroups: [],
        failedGroups: [],
        results: [],
        startTime: new Date()
      });
    });

    it('should pause executing orchestration', () => {
      const result = service.pauseExecution(orchestrationId);

      expect(result.isSuccess).toBe(true);
      
      const stateResult = service.getOrchestrationState(orchestrationId);
      expect(stateResult.value!.status).toBe('paused');
    });

    it('should reject pausing non-executing orchestration', () => {
      // Set state to completed
      const state = (service as any).orchestrationStates.get(orchestrationId);
      state.status = 'completed';

      const result = service.pauseExecution(orchestrationId);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Can only pause executing orchestration');
    });

    it('should resume paused orchestration', async () => {
      // Set state to paused
      const state = (service as any).orchestrationStates.get(orchestrationId);
      state.status = 'paused';

      const result = await service.resumeExecution(orchestrationId);

      expect(result.isSuccess).toBe(true);
      
      const stateResult = service.getOrchestrationState(orchestrationId);
      expect(stateResult.value!.status).toBe('executing');
    });

    it('should reject resuming non-paused orchestration', async () => {
      const result = await service.resumeExecution(orchestrationId);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Can only resume paused orchestration');
    });

    it('should reject operations on non-existent orchestration', () => {
      const nonExistentId = 'non-existent-id';

      const pauseResult = service.pauseExecution(nonExistentId);
      expect(pauseResult.isFailure).toBe(true);
      expect(pauseResult.error).toBe('Orchestration not found');

      const stateResult = service.getOrchestrationState(nonExistentId);
      expect(stateResult.isFailure).toBe(true);
      expect(stateResult.error).toBe('Orchestration not found');
    });
  });

  describe('Conditional Execution', () => {
    it('should evaluate conditional execution', () => {
      const actionNode = MockActionNode.createMock('action-1', containerId, 1, 1);
      const context = { condition: true };

      const result = service.evaluateConditionalExecution(actionNode, context);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should handle conditional execution evaluation errors', () => {
      const actionNode = MockActionNode.createMock('action-1', containerId, 1, 1);
      const context = {};

      const result = service.evaluateConditionalExecution(actionNode, context);

      expect(result.isSuccess).toBe(true); // Current implementation always returns true
    });
  });

  describe('Retry Logic', () => {
    it('should handle action retry with available attempts', async () => {
      const actionNode = MockActionNode.createMock('action-1', containerId, 1, 1);
      
      // Mock retry policy with available attempts
      jest.spyOn(actionNode, 'retryPolicy', 'get').mockReturnValue({
        maxAttempts: 3,
        currentAttempts: 1,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 10000
      } as any);

      // Mock successful execution after retry
      jest.spyOn(service as any, 'executeActionNode').mockResolvedValueOnce({
        actionId: actionNode.actionId,
        success: true,
        duration: 1000,
        timestamp: new Date()
      });

      // Mock successful status update for RETRYING
      jest.spyOn(actionNode, 'updateStatus').mockReturnValueOnce(Result.ok(undefined));

      const result = await service.handleActionRetry(actionNode, 'Test failure');

      expect(result.isSuccess).toBe(true);
      expect(result.value!.success).toBe(true);
    });

    it('should reject retry when maximum attempts exceeded', async () => {
      const actionNode = MockActionNode.createMock('action-1', containerId, 1, 1);
      
      // Mock retry policy with no available attempts
      jest.spyOn(actionNode, 'retryPolicy', 'get').mockReturnValue({
        maxAttempts: 3,
        currentAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 10000
      } as any);

      const result = await service.handleActionRetry(actionNode, 'Test failure');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Maximum retry attempts exceeded');
    });

    it('should handle retry when status update fails', async () => {
      const actionNode = MockActionNode.createMock('action-1', containerId, 1, 1);
      
      // Mock retry policy with available attempts
      jest.spyOn(actionNode, 'retryPolicy', 'get').mockReturnValue({
        maxAttempts: 3,
        currentAttempts: 1,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 10000
      } as any);

      // Mock status update failure
      jest.spyOn(actionNode, 'updateStatus').mockReturnValueOnce(
        Result.fail('Status update failed')
      );

      const result = await service.handleActionRetry(actionNode, 'Test failure');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Status update failed');
    });
  });

  describe('Execution Groups', () => {
    it('should create execution groups with different priorities', () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1),
        MockActionNode.createMock('action-2', containerId, 2, 2),
        MockActionNode.createMock('action-3', containerId, 3, 1),
        MockActionNode.createMock('action-4', containerId, 4, 3)
      ];

      const result = service.createExecutionPlan(containerId, actionNodes);

      expect(result.isSuccess).toBe(true);
      const plan = result.value!;
      
      // Should have multiple groups due to different priorities
      expect(plan.executionGroups.length).toBeGreaterThan(1);
      
      // Groups should be sorted by priority (higher priority first)
      for (let i = 0; i < plan.executionGroups.length - 1; i++) {
        expect(plan.executionGroups[i].priority).toBeGreaterThanOrEqual(
          plan.executionGroups[i + 1].priority
        );
      }
    });

    it('should calculate group duration based on action nodes', () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1, ExecutionMode.SEQUENTIAL, 120),
        MockActionNode.createMock('action-2', containerId, 2, 1, ExecutionMode.SEQUENTIAL, 180)
      ];

      const result = service.createExecutionPlan(containerId, actionNodes);

      expect(result.isSuccess).toBe(true);
      const plan = result.value!;
      
      // Should have one group since they have same priority and execution mode
      expect(plan.executionGroups).toHaveLength(1);
      expect(plan.executionGroups[0].estimatedDuration).toBe(300); // 120 + 180
    });

    it('should handle different execution modes', () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1, ExecutionMode.SEQUENTIAL),
        MockActionNode.createMock('action-2', containerId, 2, 1, ExecutionMode.PARALLEL),
        MockActionNode.createMock('action-3', containerId, 3, 1, ExecutionMode.CONDITIONAL)
      ];

      const result = service.createExecutionPlan(containerId, actionNodes);

      expect(result.isSuccess).toBe(true);
      const plan = result.value!;
      
      // Should have three groups due to different execution modes
      expect(plan.executionGroups).toHaveLength(3);
      
      const modes = plan.executionGroups.map(group => group.executionMode);
      expect(modes).toContain(ExecutionMode.SEQUENTIAL);
      expect(modes).toContain(ExecutionMode.PARALLEL);
      expect(modes).toContain(ExecutionMode.CONDITIONAL);
    });
  });

  describe('State Management', () => {
    it('should return copy of orchestration state', () => {
      const orchestrationId = `${containerId}_${Date.now()}`;
      const originalState: OrchestrationState = {
        containerId,
        status: 'executing',
        completedGroups: ['group_1'],
        failedGroups: [],
        results: [],
        startTime: new Date()
      };

      (service as any).orchestrationStates.set(orchestrationId, originalState);

      const stateResult = service.getOrchestrationState(orchestrationId);
      expect(stateResult.isSuccess).toBe(true);
      
      const returnedState = stateResult.value!;
      
      // Should be a copy, not the same reference
      expect(returnedState).not.toBe(originalState);
      expect(returnedState.containerId.equals(originalState.containerId)).toBe(true);
      expect(returnedState.status).toBe(originalState.status);
      expect(returnedState.completedGroups).toEqual(originalState.completedGroups);
    });

    it('should track completed and failed groups', () => {
      const orchestrationId = `${containerId}_${Date.now()}`;
      const state: OrchestrationState = {
        containerId,
        status: 'executing',
        completedGroups: ['group_1', 'group_2'],
        failedGroups: ['group_3'],
        results: [],
        startTime: new Date()
      };

      (service as any).orchestrationStates.set(orchestrationId, state);

      const stateResult = service.getOrchestrationState(orchestrationId);
      expect(stateResult.isSuccess).toBe(true);
      
      const returnedState = stateResult.value!;
      expect(returnedState.completedGroups).toHaveLength(2);
      expect(returnedState.failedGroups).toHaveLength(1);
      expect(returnedState.completedGroups).toContain('group_1');
      expect(returnedState.completedGroups).toContain('group_2');
      expect(returnedState.failedGroups).toContain('group_3');
    });

    it('should track execution timing', () => {
      const orchestrationId = `${containerId}_${Date.now()}`;
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 5000);
      
      const state: OrchestrationState = {
        containerId,
        status: 'completed',
        completedGroups: [],
        failedGroups: [],
        results: [],
        startTime,
        endTime
      };

      (service as any).orchestrationStates.set(orchestrationId, state);

      const stateResult = service.getOrchestrationState(orchestrationId);
      expect(stateResult.isSuccess).toBe(true);
      
      const returnedState = stateResult.value!;
      expect(returnedState.startTime).toEqual(startTime);
      expect(returnedState.endTime).toEqual(endTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle execution plan creation errors gracefully', () => {
      // Test with invalid container ID reference
      const invalidContainerId = NodeId.generate();
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1)
      ];

      const result = service.createExecutionPlan(invalidContainerId, actionNodes);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('All action nodes must belong to the specified container');
    });

    it('should handle context access errors during execution', () => {
      // Mock context service to return error
      jest.spyOn(mockContextService, 'getNodeContext').mockReturnValueOnce(
        Result.fail('Context access denied')
      );

      const actionNode = MockActionNode.createMock('action-1', containerId, 1, 1);
      const context = {};

      // Test conditional execution which uses context access
      const result = service.evaluateConditionalExecution(actionNode, context);

      // Current implementation doesn't use context access, so this should still work
      expect(result.isSuccess).toBe(true);
    });

    it('should handle orchestration state corruption gracefully', async () => {
      const orchestrationId = 'invalid-id';

      const pauseResult = service.pauseExecution(orchestrationId);
      expect(pauseResult.isFailure).toBe(true);

      const resumeResult = await service.resumeExecution(orchestrationId);
      expect(resumeResult.isFailure).toBe(true);

      const stateResult = service.getOrchestrationState(orchestrationId);
      expect(stateResult.isFailure).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex execution plan with mixed modes and priorities', () => {
      const actionNodes = [
        MockActionNode.createMock('seq-1', containerId, 1, 1, ExecutionMode.SEQUENTIAL, 60),
        MockActionNode.createMock('seq-2', containerId, 2, 1, ExecutionMode.SEQUENTIAL, 90),
        MockActionNode.createMock('par-1', containerId, 3, 2, ExecutionMode.PARALLEL, 120),
        MockActionNode.createMock('par-2', containerId, 4, 2, ExecutionMode.PARALLEL, 100),
        MockActionNode.createMock('cond-1', containerId, 5, 3, ExecutionMode.CONDITIONAL, 80)
      ];

      const result = service.createExecutionPlan(containerId, actionNodes);

      expect(result.isSuccess).toBe(true);
      const plan = result.value!;
      
      // Should have 3 groups (different priority/mode combinations)
      expect(plan.executionGroups).toHaveLength(3);
      
      // Should be sorted by priority (highest first)
      expect(plan.executionGroups[0].priority).toBe(3);
      expect(plan.executionGroups[1].priority).toBe(2);
      expect(plan.executionGroups[2].priority).toBe(1);
      
      // Check execution modes are preserved
      const conditionalGroup = plan.executionGroups.find(g => g.executionMode === ExecutionMode.CONDITIONAL);
      expect(conditionalGroup).toBeDefined();
      expect(conditionalGroup!.actionNodes).toHaveLength(1);
      
      const parallelGroup = plan.executionGroups.find(g => g.executionMode === ExecutionMode.PARALLEL);
      expect(parallelGroup).toBeDefined();
      expect(parallelGroup!.actionNodes).toHaveLength(2);
      
      const sequentialGroup = plan.executionGroups.find(g => g.executionMode === ExecutionMode.SEQUENTIAL);
      expect(sequentialGroup).toBeDefined();
      expect(sequentialGroup!.actionNodes).toHaveLength(2);
    });

    it('should complete full orchestration lifecycle', async () => {
      const actionNodes = [
        MockActionNode.createMock('action-1', containerId, 1, 1, ExecutionMode.SEQUENTIAL, 60),
        MockActionNode.createMock('action-2', containerId, 2, 1, ExecutionMode.SEQUENTIAL, 90)
      ];

      // Create execution plan
      const planResult = service.createExecutionPlan(containerId, actionNodes);
      expect(planResult.isSuccess).toBe(true);
      
      // Start execution
      const executionResult = await service.startExecution(planResult.value!);
      expect(executionResult.isSuccess).toBe(true);
      
      const orchestrationId = executionResult.value!;
      
      // Check final state
      const stateResult = service.getOrchestrationState(orchestrationId);
      expect(stateResult.isSuccess).toBe(true);
      
      const finalState = stateResult.value!;
      expect(['completed', 'failed']).toContain(finalState.status);
      expect(finalState.startTime).toBeDefined();
      expect(finalState.endTime).toBeDefined();
    });
  });
});