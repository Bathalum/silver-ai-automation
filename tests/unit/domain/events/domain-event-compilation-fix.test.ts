/**
 * Test for Domain Event Compilation Fix
 * TDD Test to fix eventType accessor conflicts in domain events
 * Focus: eventType should be accessed through base class getter, not instance property
 */

import { describe, it, expect } from '@jest/globals';
import { AIAgentExecutionCompleted, AIAgentExecutionFailed } from '@/lib/domain/events/ai-agent-events';
import { ActionNodeExecutionRetried, ActionNodeStatusChanged } from '@/lib/domain/events/execution-events';
import { NodeLinkRemoved, NodeLinkUpdated, CrossFeatureLinkCreated, CrossFeatureLinkRemoved } from '@/lib/domain/events/link-events';
import { ModelVersionCreated } from '@/lib/domain/events/model-events';
import { WorkflowExecutionStarted, WorkflowExecutionCompleted, WorkflowExecutionFailed, WorkflowValidationCompleted } from '@/lib/domain/events/workflow-events';

describe('Domain Event - eventType Accessor Fix', () => {
  describe('AI Agent Events', () => {
    it('should access eventType through base class getter without compilation error', () => {
      // Arrange
      const completedData = {
        agentId: 'agent-123',
        executionId: 'exec-456',
        result: { success: true },
        metrics: { duration: 1000 },
        completedAt: new Date()
      };

      // Act
      const event = new AIAgentExecutionCompleted(completedData);

      // Assert - eventType should be accessible through base class getter
      expect(event.eventType).toBe('AIAgentExecutionCompleted');
      expect(event.getEventName()).toBe('AIAgentExecutionCompleted');
      // These should be the same value
      expect(event.eventType).toBe(event.getEventName());
    });

    it('should handle AIAgentExecutionFailed eventType correctly', () => {
      // Arrange
      const failedData = {
        agentId: 'agent-123',
        executionId: 'exec-456',
        error: 'Test error',
        failedAt: new Date()
      };

      // Act
      const event = new AIAgentExecutionFailed(failedData);

      // Assert
      expect(event.eventType).toBe('AIAgentExecutionFailed');
      expect(event.getEventName()).toBe('AIAgentExecutionFailed');
      expect(event.eventType).toBe(event.getEventName());
    });
  });

  describe('Execution Events', () => {
    it('should handle ActionNodeExecutionRetried eventType correctly', () => {
      // Arrange
      const retriedData = {
        actionId: 'action-123',
        attempt: 2,
        reason: 'Timeout',
        retriedAt: new Date()
      };

      // Act
      const event = new ActionNodeExecutionRetried(retriedData);

      // Assert
      expect(event.eventType).toBe('ActionNodeExecutionRetried');
      expect(event.getEventName()).toBe('ActionNodeExecutionRetried');
    });

    it('should handle ActionNodeStatusChanged eventType correctly', () => {
      // Arrange
      const statusData = {
        actionId: 'action-123',
        oldStatus: 'idle',
        newStatus: 'running',
        changedAt: new Date()
      };

      // Act
      const event = new ActionNodeStatusChanged(statusData);

      // Assert
      expect(event.eventType).toBe('ActionNodeStatusChanged');
      expect(event.getEventName()).toBe('ActionNodeStatusChanged');
    });
  });

  describe('Link Events', () => {
    it('should handle link events eventType correctly', () => {
      // Arrange
      const linkRemovedData = {
        linkId: 'link-123',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        removedAt: new Date()
      };

      const linkUpdatedData = {
        linkId: 'link-123',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        updatedAt: new Date()
      };

      const crossLinkCreatedData = {
        linkId: 'cross-link-123',
        sourceModelId: 'model-1',
        targetModelId: 'model-2',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        linkType: 'data-flow',
        createdAt: new Date()
      };

      const crossLinkRemovedData = {
        linkId: 'cross-link-123',
        sourceModelId: 'model-1',
        targetModelId: 'model-2',
        removedAt: new Date()
      };

      // Act
      const removedEvent = new NodeLinkRemoved(linkRemovedData);
      const updatedEvent = new NodeLinkUpdated(linkUpdatedData);
      const crossCreatedEvent = new CrossFeatureLinkCreated(crossLinkCreatedData);
      const crossRemovedEvent = new CrossFeatureLinkRemoved(crossLinkRemovedData);

      // Assert
      expect(removedEvent.eventType).toBe('NodeLinkRemoved');
      expect(updatedEvent.eventType).toBe('NodeLinkUpdated');
      expect(crossCreatedEvent.eventType).toBe('CrossFeatureLinkCreated');
      expect(crossRemovedEvent.eventType).toBe('CrossFeatureLinkRemoved');
    });
  });

  describe('Model Events', () => {
    it('should handle ModelVersionCreated eventType correctly', () => {
      // Arrange
      const versionData = {
        modelId: 'model-123',
        versionId: 'v1.0.0',
        parentVersionId: 'v0.9.0',
        changes: ['Added new feature'],
        createdBy: 'user-123',
        createdAt: new Date()
      };

      // Act
      const event = new ModelVersionCreated(versionData);

      // Assert
      expect(event.eventType).toBe('ModelVersionCreated');
      expect(event.getEventName()).toBe('ModelVersionCreated');
    });
  });

  describe('Workflow Events', () => {
    it('should handle workflow events eventType correctly', () => {
      // Arrange
      const startedData = {
        workflowId: 'workflow-123',
        trigger: 'manual',
        startedAt: new Date()
      };

      const completedData = {
        workflowId: 'workflow-123',
        result: { success: true },
        completedAt: new Date()
      };

      const failedData = {
        workflowId: 'workflow-123',
        error: 'Test error',
        failedAt: new Date()
      };

      const validationData = {
        workflowId: 'workflow-123',
        validationResults: { isValid: true },
        validatedAt: new Date()
      };

      // Act
      const startedEvent = new WorkflowExecutionStarted(startedData);
      const completedEvent = new WorkflowExecutionCompleted(completedData);
      const failedEvent = new WorkflowExecutionFailed(failedData);
      const validationEvent = new WorkflowValidationCompleted(validationData);

      // Assert
      expect(startedEvent.eventType).toBe('WorkflowExecutionStarted');
      expect(completedEvent.eventType).toBe('WorkflowExecutionCompleted');
      expect(failedEvent.eventType).toBe('WorkflowExecutionFailed');
      expect(validationEvent.eventType).toBe('WorkflowValidationCompleted');
    });
  });
});