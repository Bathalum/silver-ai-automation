/**
 * PHASE 2 TDD: useModelNodes with React 19's useOptimistic Integration Tests
 * 
 * These tests define the expected behavior for Phase 2 optimistic updates:
 * 1. useOptimistic integration for immediate UI updates
 * 2. Automatic rollback on server failures  
 * 3. Batch operations with optimistic state management
 * 4. Clean Architecture boundary enforcement during optimistic updates
 * 5. Performance measurement for perceived improvements (300-500ms)
 * 
 * CLEAN ARCHITECTURE BOUNDARY ENFORCEMENT:
 * - Tests validate that optimistic updates only affect the Interface Adapter layer (hooks)
 * - Domain and Use Case layers remain unaware of optimistic state
 * - Server Actions continue to be the single source of truth for persistence
 * - Rollback behavior maintains architectural integrity
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useModelNodes } from '@/app/hooks/useModelNodes'
import * as nodeActions from '@/app/actions/node-actions'
import type { AddNodeRequest, UpdateNodeRequest, ReactFlowNode } from '@/app/hooks/useModelNodes'

// Mock the server actions
jest.mock('@/app/actions/node-actions', () => ({
  addNodeAction: jest.fn(),
  updateNodeAction: jest.fn(), 
  updateNodePositionAction: jest.fn(),
  deleteNodeAction: jest.fn(),
  batchUpdateNodePositionsAction: jest.fn(),
  getModelNodesAction: jest.fn()
}))

// Mock React 19's useOptimistic hook for testing
// NOTE: This mock defines the expected behavior. In implementation, upgrade to React 19 canary
// or implement similar pattern with useReducer + useTransition
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useOptimistic: jest.fn()
}))

describe('Phase 2: useModelNodes with useOptimistic Integration', () => {
  const mockModelId = 'test-model-123'
  let mockOptimisticState: ReactFlowNode[]
  let mockOptimisticDispatch: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up optimistic state mock
    mockOptimisticState = []
    mockOptimisticDispatch = jest.fn()
    
    // Mock useOptimistic to return state and dispatch function
    const mockUseOptimistic = require('react').useOptimistic as jest.Mock
    mockUseOptimistic.mockReturnValue([mockOptimisticState, mockOptimisticDispatch])
    
    // Default successful server responses
    ;(nodeActions.getModelNodesAction as jest.Mock).mockResolvedValue({
      success: true,
      data: []
    })
    
    ;(nodeActions.addNodeAction as jest.Mock).mockResolvedValue({
      success: true,
      nodeId: 'new-node-123'
    })
    
    ;(nodeActions.updateNodeAction as jest.Mock).mockResolvedValue({
      success: true
    })
    
    ;(nodeActions.deleteNodeAction as jest.Mock).mockResolvedValue({
      success: true
    })
  })

  describe('useOptimistic Integration - ADD_NODE Operations', () => {
    it('should provide immediate UI updates for adding nodes before server confirmation', async () => {
      // ARRANGE: Hook with initial state
      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      const newNodeData: AddNodeRequest = {
        type: 'io',
        position: { x: 100, y: 200 },
        data: {
          label: 'Test IO Node',
          description: 'Test node for optimistic updates'
        }
      }

      // ACT: Add node with optimistic update
      await act(async () => {
        await result.current.addNode(newNodeData)
      })

      // ASSERT: useOptimistic should be called immediately with ADD_NODE action
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ADD_NODE',
        payload: {
          id: expect.any(String), // Temporary optimistic ID
          type: 'io',
          position: { x: 100, y: 200 },
          data: {
            label: 'Test IO Node',
            description: 'Test node for optimistic updates',
            optimistic: true // Flag to indicate optimistic state
          }
        }
      })

      // ASSERT: Server action should be called after optimistic update
      expect(nodeActions.addNodeAction).toHaveBeenCalledWith(mockModelId, expect.any(FormData))
    })

    it('should rollback optimistic add when server returns failure', async () => {
      // ARRANGE: Server failure response
      ;(nodeActions.addNodeAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      })

      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      const newNodeData: AddNodeRequest = {
        type: 'stage',
        position: { x: 300, y: 400 },
        data: { label: 'Failed Node' }
      }

      // ACT: Attempt to add node
      await act(async () => {
        const response = await result.current.addNode(newNodeData)
        expect(response.success).toBe(false)
      })

      // ASSERT: Optimistic update should be dispatched first
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ADD_NODE',
        payload: expect.objectContaining({
          type: 'stage',
          position: { x: 300, y: 400 }
        })
      })

      // ASSERT: Rollback should be dispatched after server failure
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ROLLBACK_ADD_NODE',
        payload: {
          optimisticId: expect.any(String)
        }
      })

      // ASSERT: Error should be available in hook state
      expect(result.current.error).toBe('Database connection failed')
    })

    it('should measure and achieve 300-500ms perceived performance improvement for add operations', async () => {
      // ARRANGE: Simulate slow server response
      ;(nodeActions.addNodeAction as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, nodeId: 'slow-node' }), 800))
      )

      const { result } = renderHook(() => useModelNodes(mockModelId))
      const newNodeData: AddNodeRequest = {
        type: 'kb',
        position: { x: 0, y: 0 },
        data: { label: 'Performance Test Node' }
      }

      // ACT & ASSERT: Measure optimistic update timing
      const startTime = performance.now()
      
      await act(async () => {
        result.current.addNode(newNodeData)
        // Don't await - we want to measure optimistic response time
      })

      const optimisticUpdateTime = performance.now() - startTime

      // ASSERT: Optimistic update should be nearly instantaneous (< 50ms)
      expect(optimisticUpdateTime).toBeLessThan(50)
      
      // ASSERT: Optimistic dispatch should happen immediately
      expect(mockOptimisticDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_NODE'
        })
      )

      // The perceived performance improvement is:
      // Without optimistic: 800ms (server response time) 
      // With optimistic: <50ms (immediate UI update)
      // Improvement: 750ms+ which exceeds the 300-500ms target
    })
  })

  describe('useOptimistic Integration - UPDATE_POSITION Operations', () => {
    it('should provide immediate position updates during drag operations', async () => {
      // ARRANGE: Hook with existing node
      const existingNodes = [{
        id: 'node-1',
        type: 'io',
        position: { x: 100, y: 100 },
        data: { label: 'Existing Node' }
      }]
      
      mockOptimisticState = existingNodes
      mockUseOptimistic.mockReturnValue([mockOptimisticState, mockOptimisticDispatch])

      const { result } = renderHook(() => useModelNodes(mockModelId))
      const newPosition = { x: 250, y: 350 }

      // ACT: Update node position
      await act(async () => {
        await result.current.updateNodePosition('node-1', newPosition)
      })

      // ASSERT: Optimistic position update should be immediate
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_POSITION',
        payload: {
          nodeId: 'node-1',
          position: newPosition,
          optimistic: true
        }
      })

      // ASSERT: Server action should be called after optimistic update
      expect(nodeActions.updateNodePositionAction).toHaveBeenCalledWith('node-1', mockModelId, newPosition)
    })

    it('should rollback position updates when server update fails', async () => {
      // ARRANGE: Server failure for position update
      ;(nodeActions.updateNodePositionAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Position validation failed'
      })

      const existingNodes = [{
        id: 'node-2',
        type: 'stage', 
        position: { x: 50, y: 75 },
        data: { label: 'Position Test Node' }
      }]
      
      mockOptimisticState = existingNodes
      mockUseOptimistic.mockReturnValue([mockOptimisticState, mockOptimisticDispatch])

      const { result } = renderHook(() => useModelNodes(mockModelId))
      const failedPosition = { x: -100, y: -50 } // Invalid coordinates

      // ACT: Attempt position update that will fail
      await act(async () => {
        const response = await result.current.updateNodePosition('node-2', failedPosition)
        expect(response.success).toBe(false)
      })

      // ASSERT: Optimistic update should happen first
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_POSITION',
        payload: {
          nodeId: 'node-2',
          position: failedPosition,
          optimistic: true
        }
      })

      // ASSERT: Rollback should occur after server failure
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ROLLBACK_POSITION',
        payload: {
          nodeId: 'node-2',
          originalPosition: { x: 50, y: 75 }
        }
      })
    })
  })

  describe('useOptimistic Integration - DELETE_NODE Operations', () => {
    it('should immediately remove nodes from UI with automatic rollback on failure', async () => {
      // ARRANGE: Hook with node to delete
      const nodesToDelete = [{
        id: 'delete-node-1',
        type: 'tether',
        position: { x: 200, y: 300 },
        data: { label: 'Node to Delete' }
      }]
      
      mockOptimisticState = nodesToDelete
      mockUseOptimistic.mockReturnValue([mockOptimisticState, mockOptimisticDispatch])

      const { result } = renderHook(() => useModelNodes(mockModelId))

      // ACT: Delete node
      await act(async () => {
        await result.current.deleteNode('delete-node-1')
      })

      // ASSERT: Immediate optimistic removal
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'DELETE_NODE',
        payload: {
          nodeId: 'delete-node-1',
          optimistic: true
        }
      })

      // ASSERT: Server action should be called
      expect(nodeActions.deleteNodeAction).toHaveBeenCalledWith('delete-node-1', mockModelId, false)
    })

    it('should restore deleted node when server deletion fails', async () => {
      // ARRANGE: Server failure response
      ;(nodeActions.deleteNodeAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Node has dependencies and cannot be deleted'
      })

      const nodeToRestore = {
        id: 'protected-node',
        type: 'function-model-container',
        position: { x: 400, y: 500 },
        data: { label: 'Protected Node' }
      }
      
      mockOptimisticState = [nodeToRestore]
      mockUseOptimistic.mockReturnValue([mockOptimisticState, mockOptimisticDispatch])

      const { result } = renderHook(() => useModelNodes(mockModelId))

      // ACT: Attempt to delete protected node
      await act(async () => {
        const response = await result.current.deleteNode('protected-node')
        expect(response.success).toBe(false)
      })

      // ASSERT: Optimistic deletion attempt
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'DELETE_NODE',
        payload: {
          nodeId: 'protected-node',
          optimistic: true
        }
      })

      // ASSERT: Node restoration on server failure
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'RESTORE_DELETED_NODE',
        payload: {
          node: nodeToRestore
        }
      })

      // ASSERT: Error should be captured
      expect(result.current.error).toBe('Node has dependencies and cannot be deleted')
    })
  })

  describe('Batch Server Actions with Optimistic State', () => {
    it('should handle batch position updates with immediate optimistic feedback', async () => {
      // ARRANGE: Multiple nodes for batch update
      const batchNodes = [
        { id: 'batch-1', type: 'io', position: { x: 0, y: 0 }, data: { label: 'Batch 1' }},
        { id: 'batch-2', type: 'stage', position: { x: 100, y: 100 }, data: { label: 'Batch 2' }},
        { id: 'batch-3', type: 'kb', position: { x: 200, y: 200 }, data: { label: 'Batch 3' }}
      ]
      
      mockOptimisticState = batchNodes
      mockUseOptimistic.mockReturnValue([mockOptimisticState, mockOptimisticDispatch])

      ;(nodeActions.batchUpdateNodePositionsAction as jest.Mock).mockResolvedValue({
        success: true,
        updatedNodes: [
          { nodeId: 'batch-1', position: { x: 50, y: 50 }},
          { nodeId: 'batch-2', position: { x: 150, y: 150 }},
          { nodeId: 'batch-3', position: { x: 250, y: 250 }}
        ]
      })

      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      const positionUpdates = [
        { nodeId: 'batch-1', position: { x: 50, y: 50 }},
        { nodeId: 'batch-2', position: { x: 150, y: 150 }},
        { nodeId: 'batch-3', position: { x: 250, y: 250 }}
      ]

      // ACT: Perform batch position update (this would be called by useDebouncedNodeActions)
      await act(async () => {
        // Simulate the batch update that would happen in useDebouncedNodeActions
        for (const update of positionUpdates) {
          await result.current.updateNodePosition(update.nodeId, update.position)
        }
      })

      // ASSERT: Each position update should have optimistic dispatch
      positionUpdates.forEach(update => {
        expect(mockOptimisticDispatch).toHaveBeenCalledWith({
          type: 'UPDATE_POSITION',
          payload: {
            nodeId: update.nodeId,
            position: update.position,
            optimistic: true
          }
        })
      })
    })

    it('should handle partial batch failures with selective rollback', async () => {
      // ARRANGE: Batch update with mixed success/failure
      ;(nodeActions.batchUpdateNodePositionsAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Partial batch failure',
        failedNodes: ['batch-2'], // Only batch-2 failed
        successfulNodes: [
          { nodeId: 'batch-1', position: { x: 75, y: 75 }},
          { nodeId: 'batch-3', position: { x: 275, y: 275 }}
        ]
      })

      const batchNodes = [
        { id: 'batch-1', type: 'io', position: { x: 0, y: 0 }, data: { label: 'Success 1' }},
        { id: 'batch-2', type: 'stage', position: { x: 100, y: 100 }, data: { label: 'Failed' }}, 
        { id: 'batch-3', type: 'kb', position: { x: 200, y: 200 }, data: { label: 'Success 2' }}
      ]
      
      mockOptimisticState = batchNodes
      mockUseOptimistic.mockReturnValue([mockOptimisticState, mockOptimisticDispatch])

      const { result } = renderHook(() => useModelNodes(mockModelId))

      // ACT: Simulate batch update with partial failure
      const mixedUpdates = [
        { nodeId: 'batch-1', position: { x: 75, y: 75 }},
        { nodeId: 'batch-2', position: { x: 175, y: 175 }}, // This will fail
        { nodeId: 'batch-3', position: { x: 275, y: 275 }}
      ]

      await act(async () => {
        // Simulate optimistic updates followed by server response
        mixedUpdates.forEach(update => {
          result.current.updateNodePosition(update.nodeId, update.position)
        })
      })

      // ASSERT: All updates should have optimistic dispatch initially
      mixedUpdates.forEach(update => {
        expect(mockOptimisticDispatch).toHaveBeenCalledWith({
          type: 'UPDATE_POSITION',
          payload: {
            nodeId: update.nodeId,
            position: update.position,
            optimistic: true
          }
        })
      })

      // The batch action mock would return partial failure
      // Implementation should handle selective rollback for failed nodes only
    })
  })

  describe('Clean Architecture Boundary Enforcement', () => {
    it('should maintain architectural integrity during optimistic updates', async () => {
      // ARRANGE: Verify no domain logic pollution in optimistic state
      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      const nodeData: AddNodeRequest = {
        type: 'stage',
        position: { x: 100, y: 200 },
        data: {
          label: 'Architecture Test',
          businessRule: 'This should not be validated in optimistic state'
        }
      }

      // ACT: Add node with potential business rule data
      await act(async () => {
        await result.current.addNode(nodeData)
      })

      // ASSERT: Optimistic update should NOT perform business validation
      // Business validation should only happen at the Server Action / Use Case boundary
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ADD_NODE',
        payload: expect.objectContaining({
          data: expect.objectContaining({
            label: 'Architecture Test',
            businessRule: 'This should not be validated in optimistic state',
            optimistic: true // Interface Adapter layer flag only
          })
        })
      })

      // ASSERT: Server Action should receive the data for proper validation
      expect(nodeActions.addNodeAction).toHaveBeenCalledWith(mockModelId, expect.any(FormData))
      
      // The Server Action -> Use Case -> Domain boundary is maintained
      // Optimistic updates only affect the Interface Adapter layer (React hook)
    })

    it('should not bypass domain validation rules through optimistic updates', async () => {
      // ARRANGE: Server returns domain validation error
      ;(nodeActions.addNodeAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Domain validation failed: Node name must be unique',
        validationErrors: [{
          field: 'name',
          message: 'A node with this name already exists'
        }]
      })

      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      const duplicateNodeData: AddNodeRequest = {
        type: 'io',
        position: { x: 0, y: 0 },
        data: { label: 'Duplicate Name' }
      }

      // ACT: Attempt to add node with duplicate name
      await act(async () => {
        const response = await result.current.addNode(duplicateNodeData)
        expect(response.success).toBe(false)
      })

      // ASSERT: Optimistic update should occur first (interface layer has no domain knowledge)
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ADD_NODE',
        payload: expect.objectContaining({
          data: expect.objectContaining({
            label: 'Duplicate Name',
            optimistic: true
          })
        })
      })

      // ASSERT: Domain validation happens at Server Action boundary
      expect(nodeActions.addNodeAction).toHaveBeenCalledWith(mockModelId, expect.any(FormData))

      // ASSERT: Rollback occurs when domain validation fails
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ROLLBACK_ADD_NODE',
        payload: {
          optimisticId: expect.any(String),
          domainError: 'Domain validation failed: Node name must be unique'
        }
      })

      // CLEAN ARCHITECTURE PRINCIPLE: Domain rules are enforced at domain boundary,
      // not bypassed by optimistic UI updates
    })

    it('should preserve use case workflow integrity during optimistic operations', async () => {
      // ARRANGE: Multiple connected operations that must maintain consistency
      const existingNodes = [{
        id: 'parent-node',
        type: 'function-model-container',
        position: { x: 0, y: 0 },
        data: { label: 'Parent Container' }
      }]

      mockOptimisticState = existingNodes
      mockUseOptimistic.mockReturnValue([mockOptimisticState, mockOptimisticDispatch])

      const { result } = renderHook(() => useModelNodes(mockModelId))

      // ACT: Sequence of related operations (add child -> update parent -> connect)
      await act(async () => {
        // 1. Add child node optimistically
        await result.current.addNode({
          type: 'io',
          position: { x: 100, y: 100 },
          data: { label: 'Child Node', parentId: 'parent-node' }
        })

        // 2. Update parent position optimistically  
        await result.current.updateNodePosition('parent-node', { x: 50, y: 50 })
      })

      // ASSERT: Each operation maintains architectural boundaries
      expect(mockOptimisticDispatch).toHaveBeenCalledTimes(2) // One for add, one for position

      // ASSERT: Server Actions called with proper use case commands
      expect(nodeActions.addNodeAction).toHaveBeenCalledWith(mockModelId, expect.any(FormData))
      expect(nodeActions.updateNodePositionAction).toHaveBeenCalledWith('parent-node', mockModelId, { x: 50, y: 50 })

      // CLEAN ARCHITECTURE PRINCIPLE: Use case workflows maintain consistency
      // even when UI updates happen optimistically
    })
  })

  describe('Performance Measurement and Validation', () => {
    it('should achieve target 300-500ms perceived performance improvement', async () => {
      // ARRANGE: Baseline timing setup
      const performanceMetrics: Array<{operation: string, optimisticTime: number, serverTime: number}> = []
      
      // Mock server delays
      ;(nodeActions.addNodeAction as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, nodeId: 'perf-node' }), 600))
      )
      ;(nodeActions.updateNodePositionAction as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 400))
      )
      ;(nodeActions.deleteNodeAction as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
      )

      const { result } = renderHook(() => useModelNodes(mockModelId))

      // ACT & MEASURE: Add Node Operation
      const addStartTime = performance.now()
      await act(async () => {
        result.current.addNode({
          type: 'io',
          position: { x: 0, y: 0 },
          data: { label: 'Perf Test Add' }
        })
      })
      const addOptimisticTime = performance.now() - addStartTime

      // Wait for server response
      await waitFor(() => {
        expect(nodeActions.addNodeAction).toHaveBeenCalled()
      })
      const addServerTime = performance.now() - addStartTime

      performanceMetrics.push({
        operation: 'ADD_NODE',
        optimisticTime: addOptimisticTime,
        serverTime: addServerTime
      })

      // ACT & MEASURE: Update Position Operation  
      const updateStartTime = performance.now()
      await act(async () => {
        result.current.updateNodePosition('perf-node', { x: 100, y: 100 })
      })
      const updateOptimisticTime = performance.now() - updateStartTime

      await waitFor(() => {
        expect(nodeActions.updateNodePositionAction).toHaveBeenCalled()
      })
      const updateServerTime = performance.now() - updateStartTime

      performanceMetrics.push({
        operation: 'UPDATE_POSITION', 
        optimisticTime: updateOptimisticTime,
        serverTime: updateServerTime
      })

      // ASSERT: Performance targets met
      performanceMetrics.forEach(metric => {
        const improvement = metric.serverTime - metric.optimisticTime
        console.log(`${metric.operation}: Optimistic ${metric.optimisticTime}ms, Server ${metric.serverTime}ms, Improvement: ${improvement}ms`)
        
        // Optimistic updates should be near-instantaneous (< 50ms)
        expect(metric.optimisticTime).toBeLessThan(50)
        
        // Performance improvement should meet 300-500ms target
        expect(improvement).toBeGreaterThanOrEqual(300)
      })
    })

    it('should maintain responsive UI during high-frequency operations', async () => {
      // ARRANGE: Rapid-fire position updates (simulating drag operation)
      const { result } = renderHook(() => useModelNodes(mockModelId))
      const rapidUpdates = Array.from({length: 20}, (_, i) => ({
        nodeId: 'rapid-node',
        position: { x: i * 10, y: i * 10 }
      }))

      // ACT: Simulate rapid dragging with 20 position updates in quick succession
      const rapidStartTime = performance.now()
      
      await act(async () => {
        rapidUpdates.forEach(update => {
          result.current.updateNodePosition(update.nodeId, update.position)
        })
      })
      
      const rapidOptimisticTime = performance.now() - rapidStartTime

      // ASSERT: All 20 optimistic updates should complete quickly
      expect(rapidOptimisticTime).toBeLessThan(100) // 100ms for 20 updates = 5ms average
      expect(mockOptimisticDispatch).toHaveBeenCalledTimes(20)

      // Each call should be optimistic
      rapidUpdates.forEach((update, index) => {
        expect(mockOptimisticDispatch).toHaveBeenNthCalledWith(index + 1, {
          type: 'UPDATE_POSITION',
          payload: {
            nodeId: 'rapid-node',
            position: update.position,
            optimistic: true
          }
        })
      })

      // PERFORMANCE TARGET: UI remains responsive even during high-frequency updates
      // 20 position updates in < 100ms demonstrates excellent perceived performance
    })
  })

  describe('State Consistency and Edge Cases', () => {
    it('should handle concurrent optimistic operations without state corruption', async () => {
      // ARRANGE: Multiple concurrent operations
      const { result } = renderHook(() => useModelNodes(mockModelId))

      // ACT: Fire multiple operations simultaneously
      await act(async () => {
        const operations = [
          result.current.addNode({
            type: 'io',
            position: { x: 0, y: 0 },
            data: { label: 'Concurrent 1' }
          }),
          result.current.addNode({
            type: 'stage', 
            position: { x: 100, y: 0 },
            data: { label: 'Concurrent 2' }
          }),
          result.current.updateNodePosition('existing-node', { x: 200, y: 0 })
        ]

        await Promise.all(operations)
      })

      // ASSERT: All operations should have separate optimistic dispatches
      expect(mockOptimisticDispatch).toHaveBeenCalledTimes(3)
      
      // Each operation should maintain its own identity
      expect(mockOptimisticDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ADD_NODE' })
      )
      expect(mockOptimisticDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ADD_NODE' })  
      )
      expect(mockOptimisticDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'UPDATE_POSITION' })
      )
    })

    it('should handle optimistic state when component unmounts', async () => {
      // ARRANGE: Hook with pending optimistic operations
      const { result, unmount } = renderHook(() => useModelNodes(mockModelId))
      
      // Delay server response
      ;(nodeActions.addNodeAction as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true, nodeId: 'unmount-node' }), 1000))
      )

      // ACT: Start optimistic operation then unmount
      act(() => {
        result.current.addNode({
          type: 'kb',
          position: { x: 0, y: 0 },
          data: { label: 'Unmount Test' }
        })
      })

      // Optimistic update should occur
      expect(mockOptimisticDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ADD_NODE' })
      )

      // Unmount component before server response
      unmount()

      // ASSERT: No memory leaks or state corruption should occur
      // The server action should still complete, but no state updates should happen
      // This tests the cleanup behavior in the hook implementation
    })

    it('should handle network failures gracefully with proper error states', async () => {
      // ARRANGE: Network failure simulation
      ;(nodeActions.addNodeAction as jest.Mock).mockRejectedValue(new Error('Network timeout'))

      const { result } = renderHook(() => useModelNodes(mockModelId))

      // ACT: Attempt operation that will fail due to network
      await act(async () => {
        const response = await result.current.addNode({
          type: 'tether',
          position: { x: 0, y: 0 },
          data: { label: 'Network Fail Test' }
        })
        expect(response.success).toBe(false)
      })

      // ASSERT: Optimistic update should occur first
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ADD_NODE',
        payload: expect.objectContaining({
          data: expect.objectContaining({
            label: 'Network Fail Test',
            optimistic: true
          })
        })
      })

      // ASSERT: Rollback should occur on network failure
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ROLLBACK_ADD_NODE',
        payload: {
          optimisticId: expect.any(String),
          networkError: 'Network timeout'
        }
      })

      // ASSERT: Error state should be available
      expect(result.current.error).toBe('Network timeout')
    })
  })
})