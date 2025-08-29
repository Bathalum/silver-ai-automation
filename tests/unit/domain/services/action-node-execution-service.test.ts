/**
 * Unit tests for ActionNodeExecutionService
 * Tests individual action node execution lifecycle, retry policies, 
 * resource monitoring, and execution state tracking
 * 
 * This service manages the execution of individual action nodes within workflow orchestration,
 * enforcing Clean Architecture by maintaining clear boundaries and using Result patterns.
 */

import { ActionNodeExecutionService, ExecutionMetrics, ExecutionContext, ExecutionSnapshot } from '@/lib/domain/services/action-node-execution-service';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { ActionStatus } from '@/lib/domain/enums';

describe('ActionNodeExecutionService', () => {
  let executionService: ActionNodeExecutionService;
  const testActionId = 'action-123';
  
  beforeEach(() => {
    executionService = new ActionNodeExecutionService();
  });

  describe('execution lifecycle management', () => {
    describe('startExecution', () => {
      it('should start execution successfully for new action', async () => {
        // Act
        const result = await executionService.startExecution(testActionId);
        
        // Assert
        expect(result).toBeValidResult();
        expect(executionService.isActionExecuting(testActionId)).toBe(true);
        expect(executionService.getActiveExecutionCount()).toBe(1);
      });

      it('should create proper execution context when starting', async () => {
        // Act
        await executionService.startExecution(testActionId);
        
        // Assert - Verify internal state through public methods
        const snapshot = await executionService.getExecutionSnapshot(testActionId);
        expect(snapshot).toBeValidResult();
        expect(snapshot.value.actionId.value).toBe(testActionId);
        expect(snapshot.value.status).toBe(ActionStatus.EXECUTING);
        expect(snapshot.value.progress).toBe(0);
      });

      it('should initialize execution metrics when starting', async () => {
        // Act
        await executionService.startExecution(testActionId);
        
        // Assert
        const metrics = await executionService.getExecutionMetrics(testActionId);
        expect(metrics).toBeValidResult();
        expect(metrics.value.startTime).toBeInstanceOf(Date);
        expect(metrics.value.retryCount).toBe(0);
        expect(metrics.value.successRate).toBe(0);
        expect(metrics.value.resourceUsage.cpu).toBe(0);
        expect(metrics.value.resourceUsage.memory).toBe(0);
      });

      it('should reject starting execution for already executing action', async () => {
        // Arrange
        await executionService.startExecution(testActionId);
        
        // Act
        const result = await executionService.startExecution(testActionId);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Action node is already executing');
      });
    });

    describe('completeExecution', () => {
      beforeEach(async () => {
        await executionService.startExecution(testActionId);
      });

      it('should complete execution successfully', async () => {
        // Arrange
        const testResult = { output: 'test-output', status: 'success' };
        
        // Act
        const result = await executionService.completeExecution(testActionId, testResult);
        
        // Assert
        expect(result).toBeValidResult();
        expect(executionService.isActionExecuting(testActionId)).toBe(false);
        expect(executionService.getActiveExecutionCount()).toBe(0);
      });

      it('should update execution metrics on completion', async () => {
        // Arrange
        const testResult = { output: 'success' };
        
        // Act
        await executionService.completeExecution(testActionId, testResult);
        
        // Assert
        const metrics = await executionService.getExecutionMetrics(testActionId);
        expect(metrics).toBeValidResult();
        expect(metrics.value.endTime).toBeInstanceOf(Date);
        expect(metrics.value.duration).toBeGreaterThan(0);
        expect(metrics.value.successRate).toBe(1.0);
      });

      it('should update execution snapshot on completion', async () => {
        // Arrange
        const testResult = { output: 'test-output' };
        
        // Act
        await executionService.completeExecution(testActionId, testResult);
        
        // Assert
        const snapshot = await executionService.getExecutionSnapshot(testActionId);
        expect(snapshot).toBeValidResult();
        expect(snapshot.value.status).toBe(ActionStatus.COMPLETED);
        expect(snapshot.value.progress).toBe(100);
        expect(snapshot.value.metadata.result).toEqual(testResult);
        expect(snapshot.value.metadata.completedAt).toBeInstanceOf(Date);
      });

      it('should reject completion for non-existent execution', async () => {
        // Act
        const result = await executionService.completeExecution('non-existent', {});
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('No active execution found for action');
      });
    });

    describe('failExecution', () => {
      beforeEach(async () => {
        await executionService.startExecution(testActionId);
      });

      it('should fail execution successfully', async () => {
        // Arrange
        const errorMessage = 'Test execution failed';
        
        // Act
        const result = await executionService.failExecution(testActionId, errorMessage);
        
        // Assert
        expect(result).toBeValidResult();
        expect(executionService.isActionExecuting(testActionId)).toBe(false);
      });

      it('should update execution metrics on failure', async () => {
        // Arrange
        const errorMessage = 'Test failure';
        
        // Act
        await executionService.failExecution(testActionId, errorMessage);
        
        // Assert
        const metrics = await executionService.getExecutionMetrics(testActionId);
        expect(metrics).toBeValidResult();
        expect(metrics.value.endTime).toBeInstanceOf(Date);
        expect(metrics.value.duration).toBeGreaterThan(0);
        expect(metrics.value.successRate).toBe(0.0);
      });

      it('should update execution snapshot on failure', async () => {
        // Arrange
        const errorMessage = 'Test failure';
        
        // Act
        await executionService.failExecution(testActionId, errorMessage);
        
        // Assert
        const snapshot = await executionService.getExecutionSnapshot(testActionId);
        expect(snapshot).toBeValidResult();
        expect(snapshot.value.status).toBe(ActionStatus.FAILED);
        expect(snapshot.value.metadata.error).toBe(errorMessage);
        expect(snapshot.value.metadata.failedAt).toBeInstanceOf(Date);
      });

      it('should reject failure for non-existent execution', async () => {
        // Act
        const result = await executionService.failExecution('non-existent', 'error');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('No active execution found for action');
      });
    });
  });

  describe('retry policy management', () => {
    beforeEach(async () => {
      await executionService.startExecution(testActionId);
    });

    describe('retryExecution', () => {
      it('should retry execution when under retry limit', async () => {
        // Act
        const result = await executionService.retryExecution(testActionId);
        
        // Assert
        expect(result).toBeValidResult();
        
        // Check snapshot updated to retrying
        const snapshot = await executionService.getExecutionSnapshot(testActionId);
        expect(snapshot).toBeValidResult();
        expect(snapshot.value.status).toBe(ActionStatus.RETRYING);
        expect(snapshot.value.progress).toBe(0);
        expect(snapshot.value.metadata.retryAttempt).toBe(1);
      });

      it('should update metrics when retrying', async () => {
        // Act
        await executionService.retryExecution(testActionId);
        
        // Assert
        const metrics = await executionService.getExecutionMetrics(testActionId);
        expect(metrics).toBeValidResult();
        expect(metrics.value.retryCount).toBe(1);
        expect(metrics.value.endTime).toBeUndefined();
        expect(metrics.value.duration).toBeUndefined();
      });

      it('should reject retry when max attempts exceeded', async () => {
        // Arrange - Force max retries by accessing private state
        const context = (executionService as any).activeExecutions.get(testActionId);
        context.retryAttempt = 3; // Set to max
        
        // Act
        const result = await executionService.retryExecution(testActionId);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Maximum retry attempts exceeded');
      });

      it('should reject retry for non-existent execution', async () => {
        // Act
        const result = await executionService.retryExecution('non-existent');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('No active execution found for action');
      });
    });

    describe('retryPolicyEvaluation', () => {
      it('should allow retry when under limit and time passed', async () => {
        // Act
        const result = await executionService.retryPolicyEvaluation(testActionId);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toBe(true);
      });

      it('should reject retry when max attempts reached', async () => {
        // Arrange - Set to max retries
        const context = (executionService as any).activeExecutions.get(testActionId);
        context.retryAttempt = 3;
        
        // Act
        const result = await executionService.retryPolicyEvaluation(testActionId);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toBe(false);
      });

      it('should implement exponential backoff timing', async () => {
        // Arrange - Set recent retry with backoff constraint
        const context = (executionService as any).activeExecutions.get(testActionId);
        context.retryAttempt = 1;
        context.startTime = new Date(); // Very recent
        
        // Act
        const result = await executionService.retryPolicyEvaluation(testActionId);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toBe(false); // Too soon for retry
      });

      it('should reject policy evaluation for non-existent execution', async () => {
        // Act
        const result = await executionService.retryPolicyEvaluation('non-existent');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('No active execution found for action');
      });
    });
  });

  describe('progress tracking and monitoring', () => {
    beforeEach(async () => {
      await executionService.startExecution(testActionId);
    });

    describe('updateExecutionProgress', () => {
      it('should update progress successfully', async () => {
        // Act
        const result = await executionService.updateExecutionProgress(testActionId, 50, 'Processing data');
        
        // Assert
        expect(result).toBeValidResult();
        
        const snapshot = await executionService.getExecutionSnapshot(testActionId);
        expect(snapshot).toBeValidResult();
        expect(snapshot.value.progress).toBe(50);
        expect(snapshot.value.currentStep).toBe('Processing data');
        expect(snapshot.value.estimatedTimeRemaining).toBeGreaterThan(0);
      });

      it('should estimate remaining time based on progress', async () => {
        // Arrange - Wait a bit to ensure elapsed time
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Act
        await executionService.updateExecutionProgress(testActionId, 25);
        
        // Assert
        const snapshot = await executionService.getExecutionSnapshot(testActionId);
        expect(snapshot).toBeValidResult();
        expect(snapshot.value.estimatedTimeRemaining).toBeGreaterThan(0);
      });

      it('should reject invalid progress values', async () => {
        // Act & Assert
        const negativeResult = await executionService.updateExecutionProgress(testActionId, -10);
        expect(negativeResult).toBeFailureResult();
        expect(negativeResult).toHaveErrorMessage('Progress must be between 0 and 100');
        
        const overResult = await executionService.updateExecutionProgress(testActionId, 150);
        expect(overResult).toBeFailureResult();
        expect(overResult).toHaveErrorMessage('Progress must be between 0 and 100');
      });

      it('should reject progress update for non-existent execution', async () => {
        // Act
        const result = await executionService.updateExecutionProgress('non-existent', 50);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('No execution snapshot found for action');
      });
    });

    describe('trackExecutionResourceUsage', () => {
      it('should track resource usage successfully', async () => {
        // Arrange
        const usage = { cpu: 75.5, memory: 1024 };
        
        // Act
        const result = await executionService.trackExecutionResourceUsage(testActionId, usage);
        
        // Assert
        expect(result).toBeValidResult();
        
        const metrics = await executionService.getExecutionMetrics(testActionId);
        expect(metrics).toBeValidResult();
        expect(metrics.value.resourceUsage.cpu).toBe(75.5);
        expect(metrics.value.resourceUsage.memory).toBe(1024);
      });

      it('should reject resource tracking for non-existent execution', async () => {
        // Act
        const result = await executionService.trackExecutionResourceUsage('non-existent', { cpu: 50, memory: 512 });
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('No metrics found for action');
      });
    });
  });

  describe('execution control and cancellation', () => {
    beforeEach(async () => {
      await executionService.startExecution(testActionId);
    });

    describe('cancelExecution', () => {
      it('should cancel execution successfully', async () => {
        // Act
        const result = await executionService.cancelExecution(testActionId);
        
        // Assert
        expect(result).toBeValidResult();
        expect(executionService.isActionExecuting(testActionId)).toBe(false);
        expect(executionService.getActiveExecutionCount()).toBe(0);
      });

      it('should update snapshot to cancelled state', async () => {
        // Act
        await executionService.cancelExecution(testActionId);
        
        // Assert
        const snapshot = await executionService.getExecutionSnapshot(testActionId);
        expect(snapshot).toBeValidResult();
        expect(snapshot.value.status).toBe(ActionStatus.FAILED);
        expect(snapshot.value.metadata.cancelled).toBe(true);
        expect(snapshot.value.metadata.cancelledAt).toBeInstanceOf(Date);
      });

      it('should reject cancellation for non-existent execution', async () => {
        // Act
        const result = await executionService.cancelExecution('non-existent');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('No active execution found for action');
      });
    });
  });

  describe('query operations', () => {
    describe('getExecutionMetrics', () => {
      it('should return metrics copy for existing execution', async () => {
        // Arrange
        await executionService.startExecution(testActionId);
        
        // Act
        const result1 = await executionService.getExecutionMetrics(testActionId);
        const result2 = await executionService.getExecutionMetrics(testActionId);
        
        // Assert
        expect(result1).toBeValidResult();
        expect(result2).toBeValidResult();
        expect(result1.value).not.toBe(result2.value); // Different objects
        expect(result1.value).toEqual(result2.value); // Same content
      });

      it('should reject metrics request for non-existent execution', async () => {
        // Act
        const result = await executionService.getExecutionMetrics('non-existent');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('No metrics found for action');
      });
    });

    describe('getExecutionSnapshot', () => {
      it('should return snapshot copy for existing execution', async () => {
        // Arrange
        await executionService.startExecution(testActionId);
        
        // Act
        const result1 = await executionService.getExecutionSnapshot(testActionId);
        const result2 = await executionService.getExecutionSnapshot(testActionId);
        
        // Assert
        expect(result1).toBeValidResult();
        expect(result2).toBeValidResult();
        expect(result1.value).not.toBe(result2.value); // Different objects
        expect(result1.value).toEqual(result2.value); // Same content
      });

      it('should reject snapshot request for non-existent execution', async () => {
        // Act
        const result = await executionService.getExecutionSnapshot('non-existent');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('No execution snapshot found for action');
      });
    });

    describe('utility queries', () => {
      it('should correctly report execution status', async () => {
        // Assert initial state
        expect(executionService.isActionExecuting(testActionId)).toBe(false);
        expect(executionService.getActiveExecutionCount()).toBe(0);
        
        // Start execution
        await executionService.startExecution(testActionId);
        expect(executionService.isActionExecuting(testActionId)).toBe(true);
        expect(executionService.getActiveExecutionCount()).toBe(1);
        
        // Complete execution
        await executionService.completeExecution(testActionId, {});
        expect(executionService.isActionExecuting(testActionId)).toBe(false);
        expect(executionService.getActiveExecutionCount()).toBe(0);
      });

      it('should track multiple concurrent executions', async () => {
        // Arrange
        const actionId2 = 'action-456';
        const actionId3 = 'action-789';
        
        // Act
        await executionService.startExecution(testActionId);
        await executionService.startExecution(actionId2);
        await executionService.startExecution(actionId3);
        
        // Assert
        expect(executionService.getActiveExecutionCount()).toBe(3);
        expect(executionService.isActionExecuting(testActionId)).toBe(true);
        expect(executionService.isActionExecuting(actionId2)).toBe(true);
        expect(executionService.isActionExecuting(actionId3)).toBe(true);
        
        // Complete one
        await executionService.completeExecution(actionId2, {});
        expect(executionService.getActiveExecutionCount()).toBe(2);
        expect(executionService.isActionExecuting(actionId2)).toBe(false);
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle execution ID generation uniqueness', async () => {
      // Arrange
      const actionIds = Array.from({ length: 10 }, (_, i) => `action-${i}`);
      
      // Act - Start multiple executions rapidly
      await Promise.all(actionIds.map(id => executionService.startExecution(id)));
      
      // Assert - All should have unique execution contexts
      expect(executionService.getActiveExecutionCount()).toBe(10);
      
      // Verify each has unique execution ID by checking snapshots
      const snapshots = await Promise.all(
        actionIds.map(id => executionService.getExecutionSnapshot(id))
      );
      
      const executionIds = snapshots.map(s => (s.value.metadata as any).executionId || 'none');
      const uniqueIds = new Set(executionIds);
      expect(uniqueIds.size).toBe(executionIds.filter(id => id !== 'none').length);
    });

    it('should handle concurrent operations on same action', async () => {
      // Arrange
      await executionService.startExecution(testActionId);
      
      // Act - Try concurrent operations
      const [progressResult, resourceResult, retryResult] = await Promise.all([
        executionService.updateExecutionProgress(testActionId, 50),
        executionService.trackExecutionResourceUsage(testActionId, { cpu: 60, memory: 800 }),
        executionService.retryExecution(testActionId)
      ]);
      
      // Assert - All operations should succeed independently
      expect(progressResult).toBeValidResult();
      expect(resourceResult).toBeValidResult();
      expect(retryResult).toBeValidResult();
    });

    it('should handle malformed input gracefully', async () => {
      // Act & Assert - Various malformed inputs
      const emptyIdResult = await executionService.startExecution('');
      expect(emptyIdResult).toBeValidResult(); // Service doesn't validate ID format
      
      const nullResourceResult = await executionService.trackExecutionResourceUsage(testActionId, null as any);
      expect(nullResourceResult).toBeFailureResult();
    });
  });
});