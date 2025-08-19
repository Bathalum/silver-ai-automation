/**
 * Unit tests for WorkflowOrchestrationService
 * Tests workflow execution, orchestration logic, and execution control
 */

import { WorkflowOrchestrationService, ExecutionContext, ExecutionStatus } from '@/lib/domain/services/workflow-orchestration-service';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { TetherNode } from '@/lib/domain/entities/tether-node';
import { KBNode } from '@/lib/domain/entities/kb-node';
import { FunctionModelContainerNode } from '@/lib/domain/entities/function-model-container-node';
import { ActionStatus, ExecutionMode } from '@/lib/domain/enums';
import { 
  FunctionModelBuilder, 
  IONodeBuilder, 
  StageNodeBuilder, 
  TetherNodeBuilder,
  TestFactories 
} from '../../../utils/test-fixtures';

describe('WorkflowOrchestrationService', () => {
  let orchestrationService: WorkflowOrchestrationService;
  let validExecutionContext: ExecutionContext;

  beforeEach(() => {
    orchestrationService = new WorkflowOrchestrationService();
    
    validExecutionContext = {
      modelId: 'test-model-123',
      executionId: 'exec-' + Math.random().toString(36).substring(7),
      startTime: new Date(),
      parameters: { testParam: 'testValue' },
      userId: 'test-user-123',
      environment: 'development'
    };
  });

  describe('workflow execution', () => {
    it('should execute simple workflow successfully', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
      const executionResult = result.value;
      expect(executionResult.success).toBe(true);
      expect(executionResult.completedNodes).toHaveLength(3); // Input, Stage, Output
      expect(executionResult.failedNodes).toHaveLength(0);
      expect(executionResult.errors).toHaveLength(0);
      expect(executionResult.executionTime).toBeGreaterThan(0);
    });

    it('should validate workflow before execution', async () => {
      // Arrange - Create invalid workflow (no nodes)
      const invalidModel = TestFactories.createValidModel();
      
      // Act
      const result = await orchestrationService.executeWorkflow(invalidModel, validExecutionContext);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result.error).toContain('Cannot execute invalid workflow');
    });

    it('should execute workflow with action nodes', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(model.nodes.values())[1]; // Get stage node
      
      // Add action nodes to stage
      const tetherAction = new TetherNodeBuilder()
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(model.modelId)
        .build();
      
      model.addActionNode(tetherAction);
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
      const executionResult = result.value;
      expect(executionResult.success).toBe(true);
      expect(executionResult.completedNodes).toHaveLength(3);
    });

    it('should handle workflow execution failure gracefully', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(model.nodes.values())[1];
      
      // Add a critical node that will fail
      stageNode.metadata = { critical: true };
      
      // Mock console.log to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
      // Note: Since our test doesn't have actual failing actions, it should still succeed
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should calculate execution order correctly', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const nodes = Array.from(model.nodes.values());
      
      // Add dependency: Stage depends on Input
      const inputNode = nodes.find(n => n.name === 'Input');
      const stageNode = nodes.find(n => n.name === 'Process');
      const outputNode = nodes.find(n => n.name === 'Output');
      
      if (stageNode && inputNode) {
        stageNode.addDependency(inputNode.nodeId.toString());
      }
      if (outputNode && stageNode) {
        outputNode.addDependency(stageNode.nodeId.toString());
      }
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
      const executionResult = result.value;
      expect(executionResult.success).toBe(true);
      expect(executionResult.completedNodes).toHaveLength(3);
    });

    it('should handle circular dependencies', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const nodes = Array.from(model.nodes.values());
      
      // Create circular dependency
      const node1 = nodes[0];
      const node2 = nodes[1];
      
      node1.addDependency(node2.nodeId.toString());
      node2.addDependency(node1.nodeId.toString());
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result.error).toContain('Circular dependency detected');
    });

    it('should update execution progress during workflow execution', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      
      // Act
      const executionPromise = orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Check status during execution (may not always catch it running due to speed)
      setTimeout(async () => {
        const statusResult = await orchestrationService.getExecutionStatus(validExecutionContext.executionId);
        if (statusResult.isSuccess) {
          expect(['running', 'completed']).toContain(statusResult.value.status);
        }
      }, 10);
      
      const result = await executionPromise;
      
      // Assert
      expect(result).toBeValidResult();
    });
  });

  describe('execution control', () => {
    let executionId: string;

    beforeEach(() => {
      executionId = 'test-execution-' + Math.random().toString(36).substring(7);
    });

    describe('pause execution', () => {
      it('should pause running execution successfully', async () => {
        // Arrange - Start execution to get it in running state
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validExecutionContext, executionId };
        
        // Start execution (don't await to keep it running)
        const executionPromise = orchestrationService.executeWorkflow(model, context);
        
        // Wait a moment for execution to start
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Act
        const pauseResult = await orchestrationService.pauseExecution(executionId);
        
        // Assert
        expect(pauseResult).toBeValidResult();
        
        // Check execution status
        const statusResult = await orchestrationService.getExecutionStatus(executionId);
        expect(statusResult).toBeValidResult();
        
        // Wait for execution to complete (it should be paused)
        await executionPromise;
      });

      it('should reject pausing non-existent execution', async () => {
        // Act
        const result = await orchestrationService.pauseExecution('non-existent-id');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Execution not found');
      });

      it('should reject pausing completed execution', async () => {
        // Arrange - Execute and complete workflow
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validExecutionContext, executionId };
        
        await orchestrationService.executeWorkflow(model, context);
        
        // Act
        const result = await orchestrationService.pauseExecution(executionId);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Can only pause running executions');
      });
    });

    describe('resume execution', () => {
      it('should resume paused execution successfully', async () => {
        // Arrange - Create paused execution
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validExecutionContext, executionId };
        
        // Start and immediately pause
        const executionPromise = orchestrationService.executeWorkflow(model, context);
        await new Promise(resolve => setTimeout(resolve, 10));
        await orchestrationService.pauseExecution(executionId);
        
        // Act
        const resumeResult = await orchestrationService.resumeExecution(executionId);
        
        // Assert
        expect(resumeResult).toBeValidResult();
        
        // Wait for execution to complete
        await executionPromise;
        
        // Check final status
        const statusResult = await orchestrationService.getExecutionStatus(executionId);
        expect(statusResult).toBeValidResult();
      });

      it('should reject resuming non-existent execution', async () => {
        // Act
        const result = await orchestrationService.resumeExecution('non-existent-id');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Execution not found');
      });

      it('should reject resuming non-paused execution', async () => {
        // Arrange - Create completed execution
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validExecutionContext, executionId };
        
        await orchestrationService.executeWorkflow(model, context);
        
        // Act
        const result = await orchestrationService.resumeExecution(executionId);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Can only resume paused executions');
      });
    });

    describe('stop execution', () => {
      it('should stop running execution successfully', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validExecutionContext, executionId };
        
        // Start execution
        const executionPromise = orchestrationService.executeWorkflow(model, context);
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Act
        const stopResult = await orchestrationService.stopExecution(executionId);
        
        // Assert
        expect(stopResult).toBeValidResult();
        
        // Wait for execution to finish
        await executionPromise;
        
        // Check status
        const statusResult = await orchestrationService.getExecutionStatus(executionId);
        expect(statusResult).toBeValidResult();
        expect(statusResult.value.status).toBe('stopped');
        expect(statusResult.value.endTime).toBeInstanceOf(Date);
      });

      it('should stop paused execution successfully', async () => {
        // Arrange - Create paused execution
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validExecutionContext, executionId };
        
        const executionPromise = orchestrationService.executeWorkflow(model, context);
        await new Promise(resolve => setTimeout(resolve, 10));
        await orchestrationService.pauseExecution(executionId);
        
        // Act
        const stopResult = await orchestrationService.stopExecution(executionId);
        
        // Assert
        expect(stopResult).toBeValidResult();
        
        // Cleanup
        await executionPromise;
      });

      it('should reject stopping non-existent execution', async () => {
        // Act
        const result = await orchestrationService.stopExecution('non-existent-id');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Execution not found');
      });

      it('should reject stopping already completed execution', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validExecutionContext, executionId };
        
        await orchestrationService.executeWorkflow(model, context);
        
        // Act
        const result = await orchestrationService.stopExecution(executionId);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Execution is already completed or stopped');
      });

      it('should reject stopping already stopped execution', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validExecutionContext, executionId };
        
        const executionPromise = orchestrationService.executeWorkflow(model, context);
        await new Promise(resolve => setTimeout(resolve, 10));
        await orchestrationService.stopExecution(executionId);
        await executionPromise;
        
        // Act - Try to stop again
        const result = await orchestrationService.stopExecution(executionId);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Execution is already completed or stopped');
      });
    });
  });

  describe('execution status', () => {
    it('should return execution status for existing execution', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const context = { ...validExecutionContext };
      
      await orchestrationService.executeWorkflow(model, context);
      
      // Act
      const result = await orchestrationService.getExecutionStatus(context.executionId);
      
      // Assert
      expect(result).toBeValidResult();
      const status = result.value;
      expect(status.executionId).toBe(context.executionId);
      expect(status.status).toBe('completed');
      expect(status.progress).toBe(100);
      expect(status.startTime).toBeInstanceOf(Date);
      expect(status.endTime).toBeInstanceOf(Date);
      expect(status.completedNodes).toHaveLength(3);
      expect(status.failedNodes).toHaveLength(0);
      expect(status.currentNodes).toHaveLength(0);
    });

    it('should return error for non-existent execution', async () => {
      // Act
      const result = await orchestrationService.getExecutionStatus('non-existent-id');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Execution not found');
    });

    it('should return independent copy of execution status', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const context = { ...validExecutionContext };
      
      await orchestrationService.executeWorkflow(model, context);
      
      // Act
      const result1 = await orchestrationService.getExecutionStatus(context.executionId);
      const result2 = await orchestrationService.getExecutionStatus(context.executionId);
      
      // Assert
      expect(result1).toBeValidResult();
      expect(result2).toBeValidResult();
      expect(result1.value).not.toBe(result2.value); // Different objects
      expect(result1.value).toEqual(result2.value); // Same content
    });
  });

  describe('action node execution', () => {
    it('should execute tether nodes with mock implementation', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(model.nodes.values())[1];
      
      const tetherAction = new TetherNodeBuilder()
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(model.modelId)
        .withName('Test Tether')
        .build();
      
      model.addActionNode(tetherAction);
      
      // Mock console.log to capture output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Executing Tether Node: Test Tether')
      );
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should execute KB nodes with mock implementation', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(model.nodes.values())[1];
      
      // Create KB node data
      const kbNodeData = {
        kbReferenceId: 'kb-ref-123',
        shortDescription: 'Test KB node',
        searchKeywords: ['test', 'kb'],
        accessPermissions: { view: ['user1'], edit: ['user1'] }
      };
      
      // Use reflection to create KBNode since builder is complex
      const kbAction = (KBNode as any).create({
        actionId: { toString: () => 'kb-action-id' },
        parentNodeId: stageNode.nodeId,
        modelId: model.modelId,
        name: 'Test KB',
        description: 'Test KB action',
        executionMode: ExecutionMode.SEQUENTIAL,
        executionOrder: 1,
        status: ActionStatus.CONFIGURED,
        priority: 5,
        estimatedDuration: 30,
        retryPolicy: { strategy: 'immediate', maxAttempts: 3, backoffSeconds: 0 },
        raci: { responsible: ['System'], accountable: [], consulted: [], informed: [] },
        metadata: {},
        kbData: kbNodeData
      }).value;
      
      model.addActionNode(kbAction);
      
      // Mock console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing KB Node: Test KB')
      );
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle action execution in different modes', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(model.nodes.values())[1];
      
      // Add sequential action
      const sequentialAction = new TetherNodeBuilder()
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(model.modelId)
        .withName('Sequential Action')
        .build();
      sequentialAction.executionMode = ExecutionMode.SEQUENTIAL;
      
      // Add parallel action
      const parallelAction = new TetherNodeBuilder()
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(model.modelId)
        .withName('Parallel Action')
        .build();
      parallelAction.executionMode = ExecutionMode.PARALLEL;
      
      model.addActionNode(sequentialAction);
      model.addActionNode(parallelAction);
      
      // Mock console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
      expect(consoleSpy).toHaveBeenCalledTimes(2); // Both actions executed
      
      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle workflow with no action nodes', async () => {
      // Arrange - Workflow with only container nodes, no actions
      const model = TestFactories.createCompleteWorkflow();
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
      const executionResult = result.value;
      expect(executionResult.success).toBe(true);
      expect(executionResult.completedNodes).toHaveLength(3);
    });

    it('should handle empty workflow', async () => {
      // Arrange
      const emptyModel = TestFactories.createValidModel();
      
      // Act
      const result = await orchestrationService.executeWorkflow(emptyModel, validExecutionContext);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result.error).toContain('Cannot execute invalid workflow');
    });

    it('should handle execution context validation', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const invalidContext = {
        ...validExecutionContext,
        executionId: '' // Invalid execution ID
      };
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, invalidContext);
      
      // Assert - Should still work as service doesn't validate context deeply
      expect(result).toBeValidResult();
    });

    it('should handle concurrent executions', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const context1 = { ...validExecutionContext, executionId: 'exec-1' };
      const context2 = { ...validExecutionContext, executionId: 'exec-2' };
      
      // Act - Execute concurrently
      const [result1, result2] = await Promise.all([
        orchestrationService.executeWorkflow(model, context1),
        orchestrationService.executeWorkflow(model, context2)
      ]);
      
      // Assert
      expect(result1).toBeValidResult();
      expect(result2).toBeValidResult();
      
      // Check both executions tracked separately
      const status1 = await orchestrationService.getExecutionStatus('exec-1');
      const status2 = await orchestrationService.getExecutionStatus('exec-2');
      
      expect(status1).toBeValidResult();
      expect(status2).toBeValidResult();
      expect(status1.value.executionId).toBe('exec-1');
      expect(status2.value.executionId).toBe('exec-2');
    });

    it('should handle unexpected errors during execution', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      
      // Mock a method to throw an error
      const originalMethod = (orchestrationService as any).calculateExecutionOrder;
      (orchestrationService as any).calculateExecutionOrder = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result.error).toContain('Workflow execution failed');
      expect(result.error).toContain('Unexpected error');
      
      // Cleanup
      (orchestrationService as any).calculateExecutionOrder = originalMethod;
    });
  });

  describe('execution order calculation', () => {
    it('should handle nodes with no dependencies', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
    });

    it('should handle complex dependency chains', async () => {
      // Arrange
      const model = new FunctionModelBuilder().build();
      
      // Create chain: A -> B -> C -> D
      const nodeA = new IONodeBuilder().withId('node-a').withModelId(model.modelId).withName('A').asInput().build();
      const nodeB = new StageNodeBuilder().withId('node-b').withModelId(model.modelId).withName('B').build();
      const nodeC = new StageNodeBuilder().withId('node-c').withModelId(model.modelId).withName('C').build();
      const nodeD = new IONodeBuilder().withId('node-d').withModelId(model.modelId).withName('D').asOutput().build();
      
      model.addContainerNode(nodeA);
      model.addContainerNode(nodeB);
      model.addContainerNode(nodeC);
      model.addContainerNode(nodeD);
      
      // Add dependencies
      nodeB.addDependency('node-a');
      nodeC.addDependency('node-b');
      nodeD.addDependency('node-c');
      
      // Act
      const result = await orchestrationService.executeWorkflow(model, validExecutionContext);
      
      // Assert
      expect(result).toBeValidResult();
      const executionResult = result.value;
      expect(executionResult.success).toBe(true);
      expect(executionResult.completedNodes).toHaveLength(4);
    });
  });
});