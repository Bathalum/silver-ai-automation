/**
 * UNIT TEST - saveModelWithNodesAction
 * 
 * This test focuses on the Clean Architecture compliance and business logic
 * of saveModelWithNodesAction without full database integration.
 * 
 * TDD APPROACH:
 * 1. RED: Test the expected behavior in isolation
 * 2. GREEN: Implement to pass
 * 3. REFACTOR: Clean up while tests pass
 * 
 * Focus areas:
 * - FormData parsing and validation 
 * - DI container integration
 * - Use case delegation
 * - Clean Architecture boundaries
 * - Error handling
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock Next.js functions
const mockRevalidatePath = jest.fn();
jest.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath
}));

// Mock authentication
jest.mock('@/lib/supabase/server', () => ({
  getAuthenticatedUser: jest.fn(() => Promise.resolve({
    id: 'test-user-id',
    email: 'test@example.com'
  }))
}));

// Create a mock container that behaves like the real one
const createMockContainer = (manageNodesUseCase: any) => {
  const mockScope = {
    resolve: jest.fn().mockImplementation((token) => {
      if (token.toString().includes('MANAGE_WORKFLOW_NODES_USE_CASE')) {
        return Promise.resolve({ 
          isFailure: false, 
          value: manageNodesUseCase 
        });
      }
      return Promise.resolve({ 
        isFailure: true, 
        error: 'Service not found' 
      });
    }),
    dispose: jest.fn().mockResolvedValue(undefined)
  };

  return {
    createScope: jest.fn().mockReturnValue(mockScope)
  };
};

// Mock the setupContainer function
const mockSetupContainer = jest.fn();
jest.mock('@/lib/infrastructure/di/function-model-module', () => ({
  setupContainer: mockSetupContainer
}));

import { saveModelWithNodesAction } from '@/app/actions/model-actions';

describe('saveModelWithNodesAction - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FormData validation', () => {
    it('should reject missing nodes data', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      const formData = new FormData();
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('No nodes data provided');
      expect(result.modelId).toBeUndefined();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should reject invalid JSON in nodes data', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      const formData = new FormData();
      formData.append('nodes', 'invalid-json');
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid nodes data format');
      expect(result.modelId).toBeUndefined();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should reject non-array nodes data', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      const formData = new FormData();
      formData.append('nodes', JSON.stringify({ not: 'array' }));
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Nodes data must be an array');
      expect(result.modelId).toBeUndefined();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should validate node structure and reject invalid nodes', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      const formData = new FormData();
      const invalidNode = { id: 'test-node' }; // Missing position
      formData.append('nodes', JSON.stringify([invalidNode]));
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid node data for node test-node');
      expect(result.modelId).toBeUndefined();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('Clean Architecture compliance', () => {
    it('should delegate to ManageWorkflowNodesUseCase for business logic', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      const mockBatchUpdatePositions = jest.fn().mockResolvedValue({
        isFailure: false,
        value: []
      });
      
      const mockManageNodesUseCase = {
        batchUpdatePositions: mockBatchUpdatePositions
      };

      const mockContainer = createMockContainer(mockManageNodesUseCase);
      mockSetupContainer.mockResolvedValue(mockContainer);

      const formData = new FormData();
      const validNodesData = [
        { id: 'node1', position: { x: 100, y: 200 } },
        { id: 'node2', position: { x: 300, y: 400 } }
      ];
      formData.append('nodes', JSON.stringify(validNodesData));
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(true);
      expect(result.modelId).toBe(modelId);
      expect(result.error).toBeUndefined();
      
      // Verify use case was called with correct parameters
      expect(mockBatchUpdatePositions).toHaveBeenCalledWith(
        modelId,
        [
          { nodeId: 'node1', position: { x: 100, y: 200 } },
          { nodeId: 'node2', position: { x: 300, y: 400 } }
        ],
        'test-user-id'
      );
      
      // Verify UI concerns (revalidation) were handled
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/function-model/${modelId}`);
      
      // Verify scope cleanup
      expect(mockContainer.createScope().dispose).toHaveBeenCalled();
    });

    it('should handle use case failures gracefully', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      const mockBatchUpdatePositions = jest.fn().mockResolvedValue({
        isFailure: true,
        error: 'Node validation failed'
      });
      
      const mockManageNodesUseCase = {
        batchUpdatePositions: mockBatchUpdatePositions
      };

      const mockContainer = createMockContainer(mockManageNodesUseCase);
      mockSetupContainer.mockResolvedValue(mockContainer);

      const formData = new FormData();
      const validNodesData = [
        { id: 'invalid-node', position: { x: 100, y: 200 } }
      ];
      formData.append('nodes', JSON.stringify(validNodesData));
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update node positions: Node validation failed');
      expect(result.modelId).toBeUndefined();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      
      // Verify scope cleanup still happened
      expect(mockContainer.createScope().dispose).toHaveBeenCalled();
    });

    it('should handle dependency injection failures', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      mockSetupContainer.mockRejectedValue(new Error('Container setup failed'));

      const formData = new FormData();
      const validNodesData = [
        { id: 'node1', position: { x: 100, y: 200 } }
      ];
      formData.append('nodes', JSON.stringify(validNodesData));
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Container setup failed');
      expect(result.modelId).toBeUndefined();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should handle service resolution failures', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      
      const mockScope = {
        resolve: jest.fn().mockResolvedValue({ 
          isFailure: true, 
          error: 'Service resolution failed' 
        }),
        dispose: jest.fn().mockResolvedValue(undefined)
      };

      const mockContainer = {
        createScope: jest.fn().mockReturnValue(mockScope)
      };

      mockSetupContainer.mockResolvedValue(mockContainer);

      const formData = new FormData();
      const validNodesData = [
        { id: 'node1', position: { x: 100, y: 200 } }
      ];
      formData.append('nodes', JSON.stringify(validNodesData));
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to initialize workflow nodes management service');
      expect(result.modelId).toBeUndefined();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      
      // Verify cleanup
      expect(mockScope.dispose).toHaveBeenCalled();
    });
  });

  describe('Resource management', () => {
    it('should properly dispose container scope on success', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      const mockBatchUpdatePositions = jest.fn().mockResolvedValue({
        isFailure: false,
        value: []
      });
      
      const mockManageNodesUseCase = {
        batchUpdatePositions: mockBatchUpdatePositions
      };

      const mockScope = {
        resolve: jest.fn().mockResolvedValue({
          isFailure: false,
          value: mockManageNodesUseCase
        }),
        dispose: jest.fn().mockResolvedValue(undefined)
      };

      const mockContainer = {
        createScope: jest.fn().mockReturnValue(mockScope)
      };

      mockSetupContainer.mockResolvedValue(mockContainer);

      const formData = new FormData();
      const validNodesData = [
        { id: 'node1', position: { x: 100, y: 200 } }
      ];
      formData.append('nodes', JSON.stringify(validNodesData));
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(true);
      expect(mockScope.dispose).toHaveBeenCalledTimes(1);
    });

    it('should properly dispose container scope on failure', async () => {
      // ARRANGE
      const modelId = 'test-model-id';
      const mockBatchUpdatePositions = jest.fn().mockRejectedValue(new Error('Unexpected error'));
      
      const mockManageNodesUseCase = {
        batchUpdatePositions: mockBatchUpdatePositions
      };

      const mockScope = {
        resolve: jest.fn().mockResolvedValue({
          isFailure: false,
          value: mockManageNodesUseCase
        }),
        dispose: jest.fn().mockResolvedValue(undefined)
      };

      const mockContainer = {
        createScope: jest.fn().mockReturnValue(mockScope)
      };

      mockSetupContainer.mockResolvedValue(mockContainer);

      const formData = new FormData();
      const validNodesData = [
        { id: 'node1', position: { x: 100, y: 200 } }
      ];
      formData.append('nodes', JSON.stringify(validNodesData));
      
      // ACT
      const result = await saveModelWithNodesAction(modelId, formData);
      
      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(mockScope.dispose).toHaveBeenCalledTimes(1);
    });
  });
});