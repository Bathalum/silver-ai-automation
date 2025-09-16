/**
 * @fileoverview TDD Functional Tests for Edge Server Actions
 * 
 * GREEN PHASE: Test the actual behavior of implemented edge server actions
 * These tests validate that the interface adapters layer correctly integrates
 * with the application layer following Clean Architecture principles.
 * 
 * Test Strategy:
 * - Test successful edge creation with valid data
 * - Test successful edge deletion with valid data  
 * - Test successful model edges retrieval
 * - Test authentication and authorization validation
 * - Test form data validation and error handling
 * - Test integration with use cases and domain services
 * 
 * Layer Integration Testing:
 * - Interface Adapters: Server actions (this layer)
 * - Application: Use cases (CreateEdgeUseCase, DeleteEdgeUseCase, GetModelEdgesQuery)
 * - Domain: EdgeValidationService, Edge entity
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createEdgeAction, deleteEdgeAction, getModelEdgesAction } from '@/app/actions/edge-actions';
import { EdgeActionResult } from '@/lib/api/types';
import { ServiceTokens } from '@/lib/infrastructure/di/container';

// Mock Next.js dependencies
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

// Mock Supabase - simulate successful authentication and data operations
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-model-123',
              user_id: 'test-user-123',
              permissions: null
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

// Mock DI container to provide test implementations
const mockCreateEdgeUseCase = {
  execute: jest.fn()
};

const mockDeleteEdgeUseCase = {
  execute: jest.fn()
};

const mockGetModelEdgesQueryHandler = {
  handle: jest.fn()
};

jest.mock('@/lib/infrastructure/di/function-model-module', () => ({
  createFunctionModelContainer: jest.fn(() => ({
    createScope: jest.fn(() => ({
      resolve: jest.fn((token) => {
        if (token.toString() === ServiceTokens.CREATE_EDGE_USE_CASE.toString()) {
          return Promise.resolve({ isFailure: false, value: mockCreateEdgeUseCase });
        }
        if (token.toString() === ServiceTokens.DELETE_EDGE_USE_CASE.toString()) {
          return Promise.resolve({ isFailure: false, value: mockDeleteEdgeUseCase });
        }
        if (token.toString() === ServiceTokens.GET_MODEL_EDGES_QUERY_HANDLER.toString()) {
          return Promise.resolve({ isFailure: false, value: mockGetModelEdgesQueryHandler });
        }
        return Promise.resolve({ isFailure: true, error: 'Service not found' });
      }),
      dispose: jest.fn()
    }))
  }))
}));

describe('Edge Server Actions - TDD Functional Tests (GREEN Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEdgeAction', () => {
    it('should successfully create an edge with valid form data', async () => {
      // Arrange
      const mockResult = {
        isFailure: false,
        value: {
          linkId: 'edge-123',
          sourceNodeId: 'node-1',
          targetNodeId: 'node-2',
          linkType: 'DEPENDENCY',
          linkStrength: 0.8,
          createdAt: new Date()
        }
      };
      mockCreateEdgeUseCase.execute.mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append('modelId', 'test-model-123');
      formData.append('source', 'node-1');
      formData.append('target', 'node-2');
      formData.append('sourceHandle', 'output-1');
      formData.append('targetHandle', 'input-1');

      // Act
      const result: EdgeActionResult = await createEdgeAction(formData);

      // Assert
      if (!result.success) {
        console.log('Test failed - result:', result);
      }
      expect(result.success).toBe(true);
      expect(result.edgeId).toBe('edge-123');
      expect(result.error).toBeUndefined();
      expect(result.validationErrors).toBeUndefined();
      
      // Verify use case was called with correct command
      expect(mockCreateEdgeUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceNodeId: 'node-1',
          targetNodeId: 'node-2',
          sourceHandle: 'output-1',
          targetHandle: 'input-1',
          modelId: 'test-model-123',
          userId: 'test-user-123'
        })
      );
    });

    it('should return validation errors for invalid form data', async () => {
      // Arrange
      const formData = new FormData();
      // Missing required fields

      // Act
      const result: EdgeActionResult = await createEdgeAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.validationErrors).toHaveLength(3); // modelId, source, target required
      expect(result.validationErrors).toEqual(
        expect.arrayContaining([
          { field: 'modelId', message: 'Model ID is required' },
          { field: 'source', message: 'Source node ID is required' },
          { field: 'target', message: 'Target node ID is required' }
        ])
      );
    });

    it('should prevent self-connections', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('modelId', 'test-model-123');
      formData.append('source', 'node-1');
      formData.append('target', 'node-1'); // Same as source

      // Act
      const result: EdgeActionResult = await createEdgeAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.validationErrors).toEqual(
        expect.arrayContaining([
          { field: 'target', message: 'Self-connections are not allowed' }
        ])
      );
    });

    it('should handle use case failures gracefully', async () => {
      // Arrange
      const mockResult = {
        isFailure: true,
        error: 'Circular dependency detected'
      };
      mockCreateEdgeUseCase.execute.mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append('modelId', 'test-model-123');
      formData.append('source', 'node-1');
      formData.append('target', 'node-2');

      // Act
      const result: EdgeActionResult = await createEdgeAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Circular dependency detected');
    });
  });

  describe('deleteEdgeAction', () => {
    it('should successfully delete an edge with valid form data', async () => {
      // Arrange
      const mockResult = {
        isFailure: false,
        value: {
          linkId: 'edge-123',
          sourceNodeId: 'node-1',
          targetNodeId: 'node-2',
          deletedAt: new Date(),
          reason: 'User requested removal'
        }
      };
      mockDeleteEdgeUseCase.execute.mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append('edgeId', 'edge-123');
      formData.append('modelId', 'test-model-123');
      formData.append('reason', 'User requested removal');

      // Act
      const result: EdgeActionResult = await deleteEdgeAction(formData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.edgeId).toBe('edge-123');
      expect(result.error).toBeUndefined();
      
      // Verify use case was called with correct command
      expect(mockDeleteEdgeUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          linkId: 'edge-123',
          modelId: 'test-model-123',
          userId: 'test-user-123',
          reason: 'User requested removal'
        })
      );
    });

    it('should return validation errors for missing edge ID', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('modelId', 'test-model-123');
      // Missing edgeId

      // Act
      const result: EdgeActionResult = await deleteEdgeAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.validationErrors).toEqual(
        expect.arrayContaining([
          { field: 'edgeId', message: 'Edge ID is required' }
        ])
      );
    });

    it('should handle edge not found errors', async () => {
      // Arrange
      const mockResult = {
        isFailure: true,
        error: 'Edge not found: Invalid link ID format'
      };
      mockDeleteEdgeUseCase.execute.mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append('edgeId', 'invalid-edge-id');
      formData.append('modelId', 'test-model-123');

      // Act
      const result: EdgeActionResult = await deleteEdgeAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Edge not found: Invalid link ID format');
    });
  });

  describe('getModelEdgesAction', () => {
    it('should successfully retrieve model edges', async () => {
      // Arrange
      const mockResult = {
        isFailure: false,
        value: {
          modelId: 'test-model-123',
          edges: [
            {
              id: 'edge-1',
              source: 'node-1',
              target: 'node-2',
              sourceHandle: 'output-1',
              targetHandle: 'input-1',
              type: 'workflow',
              animated: true,
              style: { stroke: '#3b82f6' },
              data: {
                linkType: 'DEPENDENCY',
                linkStrength: 0.8,
                linkContext: {},
                createdAt: '2024-01-15T10:00:00Z',
                updatedAt: '2024-01-15T10:00:00Z'
              },
              markerEnd: { type: 'arrowclosed', width: 20, height: 20 }
            }
          ],
          totalCount: 1,
          metadata: undefined
        }
      };
      mockGetModelEdgesQueryHandler.handle.mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append('modelId', 'test-model-123');

      // Act
      const result: EdgeActionResult = await getModelEdgesAction(formData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toEqual(
        expect.objectContaining({
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          type: 'workflow'
        })
      );
      
      // Verify query handler was called with correct query
      expect(mockGetModelEdgesQueryHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'test-model-123',
          userId: 'test-user-123',
          includeMetadata: false,
          includeDeleted: false
        })
      );
    });

    it('should support metadata inclusion', async () => {
      // Arrange
      const mockResult = {
        isFailure: false,
        value: {
          modelId: 'test-model-123',
          edges: [],
          totalCount: 0,
          metadata: {
            linkTypeBreakdown: {},
            averageLinkStrength: 0,
            strongLinksCount: 0,
            weakLinksCount: 0,
            crossFeatureLinksCount: 0,
            lastUpdated: new Date()
          }
        }
      };
      mockGetModelEdgesQueryHandler.handle.mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append('modelId', 'test-model-123');
      formData.append('includeMetadata', 'true');

      // Act
      const result: EdgeActionResult = await getModelEdgesAction(formData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      
      // Verify metadata was requested
      expect(mockGetModelEdgesQueryHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'test-model-123',
          includeMetadata: true
        })
      );
    });

    it('should return validation errors for missing model ID', async () => {
      // Arrange
      const formData = new FormData();
      // Missing modelId

      // Act
      const result: EdgeActionResult = await getModelEdgesAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.validationErrors).toEqual(
        expect.arrayContaining([
          { field: 'modelId', message: 'Model ID is required' }
        ])
      );
    });

    it('should handle query failures gracefully', async () => {
      // Arrange
      const mockResult = {
        isFailure: true,
        error: 'Failed to retrieve model edges: Invalid model ID format'
      };
      mockGetModelEdgesQueryHandler.handle.mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append('modelId', 'test-model-123');

      // Act
      const result: EdgeActionResult = await getModelEdgesAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve model edges: Invalid model ID format');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should handle authentication errors', async () => {
      // Mock authentication failure
      const mockCreateClient = jest.fn(() => ({
        auth: {
          getUser: jest.fn(() => ({
            data: { user: null },
            error: new Error('Authentication failed')
          }))
        }
      }));

      jest.doMock('@/lib/supabase/server', () => ({
        createClient: mockCreateClient
      }));

      const formData = new FormData();
      formData.append('modelId', 'test-model-123');
      formData.append('source', 'node-1');
      formData.append('target', 'node-2');

      // Act
      const result: EdgeActionResult = await createEdgeAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });
  });
});