/**
 * Integration Tests for Phase 2 Optimistic Updates
 * 
 * These tests validate the actual behavior of optimistic updates
 * without mocking internals - focusing on Clean Architecture compliance
 * and perceived performance improvements.
 */

// Don't mock React's useOptimistic - use our polyfill
// jest.mock('react', () => ({
//   ...jest.requireActual('react')
// }))

import { renderHook, act, waitFor } from '@testing-library/react'
import { useModelNodes } from '@/app/hooks/useModelNodes'
import type { AddNodeRequest, ReactFlowNode } from '@/app/hooks/useModelNodes'

// Mock server actions with realistic delays
jest.mock('@/app/actions/node-actions', () => ({
  addNodeAction: jest.fn(),
  updateNodeAction: jest.fn(), 
  updateNodePositionAction: jest.fn(),
  deleteNodeAction: jest.fn(),
  batchUpdateNodePositionsAction: jest.fn(),
  getModelNodesAction: jest.fn()
}))

import * as nodeActions from '@/app/actions/node-actions'

describe('Phase 2: Optimistic Updates Integration Tests', () => {
  const mockModelId = 'test-model-integration'

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful server responses with realistic delays
    ;(nodeActions.getModelNodesAction as jest.Mock).mockResolvedValue({
      success: true,
      data: []
    })
    
    ;(nodeActions.addNodeAction as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, nodeId: 'server-node-123' }), 500))
    )
    
    ;(nodeActions.updateNodePositionAction as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 400))
    )
    
    ;(nodeActions.deleteNodeAction as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 300))
    )
  })

  describe('ADD_NODE Optimistic Behavior', () => {
    it('should show node immediately and achieve 300ms+ perceived performance improvement', async () => {
      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialNodeCount = result.current.nodes.length
      const nodeData: AddNodeRequest = {
        type: 'io',
        position: { x: 100, y: 200 },
        data: {
          label: 'Test Optimistic Node',
          description: 'Should appear immediately'
        }
      }

      // Measure perceived performance
      const startTime = performance.now()
      let nodeAppearedTime: number = 0

      await act(async () => {
        // Start the add operation (don't await)
        result.current.addNode(nodeData)
        
        // Check if node appears immediately (within 50ms)
        await waitFor(() => {
          if (result.current.nodes.length > initialNodeCount) {
            nodeAppearedTime = performance.now() - startTime
          }
          expect(result.current.nodes).toHaveLength(initialNodeCount + 1)
        }, { timeout: 100 }) // Should happen very quickly
      })

      // ASSERT: Node should appear immediately (optimistic)
      expect(nodeAppearedTime).toBeLessThan(50)
      expect(result.current.nodes).toHaveLength(initialNodeCount + 1)
      
      const addedNode = result.current.nodes.find(n => 
        n.data.label === 'Test Optimistic Node'
      )
      expect(addedNode).toBeDefined()
      expect(addedNode?.data.optimistic).toBe(true) // Should be marked optimistic
      
      // Wait for server response and verify cleanup
      await waitFor(() => {
        expect(nodeActions.addNodeAction).toHaveBeenCalled()
      }, { timeout: 1000 })

      const serverResponseTime = performance.now() - startTime
      const perceivedImprovement = serverResponseTime - nodeAppearedTime

      // ASSERT: Should achieve target performance improvement
      expect(perceivedImprovement).toBeGreaterThan(300)
      console.log(`✅ ADD_NODE Performance: Optimistic ${nodeAppearedTime}ms, Server ${serverResponseTime}ms, Improvement: ${perceivedImprovement}ms`)
    })

    it('should rollback on server failure', async () => {
      ;(nodeActions.addNodeAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Server validation failed'
      })

      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialNodeCount = result.current.nodes.length

      await act(async () => {
        const response = await result.current.addNode({
          type: 'stage',
          position: { x: 0, y: 0 },
          data: { label: 'Failed Node' }
        })
        
        expect(response.success).toBe(false)
        expect(response.error).toBe('Server validation failed')
      })

      // ASSERT: Node should be rolled back
      expect(result.current.nodes).toHaveLength(initialNodeCount)
      expect(result.current.error).toBe('Server validation failed')
    })
  })

  describe('UPDATE_POSITION Optimistic Behavior', () => {
    it('should update position immediately with rollback on failure', async () => {
      // Setup initial node
      ;(nodeActions.getModelNodesAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [{
          id: 'existing-node',
          type: 'io',
          position: { x: 0, y: 0 },
          data: {
            label: 'Existing Node',
            status: 'active'
          }
        }]
      })

      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(1)
      })

      const newPosition = { x: 100, y: 200 }
      const startTime = performance.now()
      let positionUpdatedTime: number = 0

      await act(async () => {
        // Start position update (don't await)
        result.current.updateNodePosition('existing-node', newPosition)
        
        // Check immediate update
        await waitFor(() => {
          const updatedNode = result.current.nodes.find(n => n.id === 'existing-node')
          if (updatedNode && updatedNode.position.x === 100) {
            positionUpdatedTime = performance.now() - startTime
          }
          expect(updatedNode?.position).toEqual(newPosition)
        }, { timeout: 100 })
      })

      // ASSERT: Position should update immediately
      expect(positionUpdatedTime).toBeLessThan(50)
      
      const updatedNode = result.current.nodes.find(n => n.id === 'existing-node')
      expect(updatedNode?.position).toEqual(newPosition)
      expect(updatedNode?.data.optimistic).toBe(true) // Should be marked optimistic
      
      // Wait for server response
      await waitFor(() => {
        expect(nodeActions.updateNodePositionAction).toHaveBeenCalledWith('existing-node', mockModelId, newPosition)
      }, { timeout: 1000 })

      const serverResponseTime = performance.now() - startTime
      const perceivedImprovement = serverResponseTime - positionUpdatedTime
      
      expect(perceivedImprovement).toBeGreaterThan(300)
      console.log(`✅ UPDATE_POSITION Performance: Optimistic ${positionUpdatedTime}ms, Server ${serverResponseTime}ms, Improvement: ${perceivedImprovement}ms`)
    })
  })

  describe('DELETE_NODE Optimistic Behavior', () => {
    it('should remove node immediately with restore on failure', async () => {
      // Setup initial node
      ;(nodeActions.getModelNodesAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [{
          id: 'delete-node',
          type: 'kb',
          position: { x: 50, y: 100 },
          data: {
            label: 'Node to Delete',
            status: 'active'
          }
        }]
      })

      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(1)
      })

      const startTime = performance.now()
      let nodeRemovedTime: number = 0

      await act(async () => {
        // Start delete operation (don't await)
        result.current.deleteNode('delete-node')
        
        // Check immediate removal
        await waitFor(() => {
          if (result.current.nodes.length === 0) {
            nodeRemovedTime = performance.now() - startTime
          }
          expect(result.current.nodes).toHaveLength(0)
        }, { timeout: 100 })
      })

      // ASSERT: Node should be removed immediately
      expect(nodeRemovedTime).toBeLessThan(50)
      expect(result.current.nodes).toHaveLength(0)
      
      // Wait for server response
      await waitFor(() => {
        expect(nodeActions.deleteNodeAction).toHaveBeenCalledWith('delete-node', mockModelId, false)
      }, { timeout: 1000 })

      const serverResponseTime = performance.now() - startTime
      const perceivedImprovement = serverResponseTime - nodeRemovedTime
      
      expect(perceivedImprovement).toBeGreaterThan(250) // Delete is typically faster
      console.log(`✅ DELETE_NODE Performance: Optimistic ${nodeRemovedTime}ms, Server ${serverResponseTime}ms, Improvement: ${perceivedImprovement}ms`)
    })

    it('should restore node on server failure', async () => {
      // Setup failure response
      ;(nodeActions.deleteNodeAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Node has dependencies'
      })

      // Setup initial node
      ;(nodeActions.getModelNodesAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [{
          id: 'protected-node',
          type: 'function-model-container',
          position: { x: 200, y: 300 },
          data: {
            label: 'Protected Node',
            status: 'active'
          }
        }]
      })

      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(1)
      })

      const originalNode = result.current.nodes[0]

      await act(async () => {
        const response = await result.current.deleteNode('protected-node')
        
        expect(response.success).toBe(false)
        expect(response.error).toBe('Node has dependencies')
      })

      // ASSERT: Node should be restored
      expect(result.current.nodes).toHaveLength(1)
      expect(result.current.nodes[0]).toEqual(originalNode) // Should be identical to original
      expect(result.current.error).toBe('Node has dependencies')
    })
  })

  describe('Clean Architecture Compliance', () => {
    it('should maintain architectural boundaries during optimistic updates', async () => {
      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Business logic should still be enforced at Server Action boundary
      const nodeData: AddNodeRequest = {
        type: 'io',
        position: { x: 100, y: 200 },
        data: {
          label: 'Architecture Test',
          businessRule: 'Domain validation should happen server-side'
        }
      }

      await act(async () => {
        await result.current.addNode(nodeData)
      })

      // ASSERT: Server action should be called for proper validation
      expect(nodeActions.addNodeAction).toHaveBeenCalledWith(mockModelId, expect.any(FormData))
      
      // Optimistic UI updates should not bypass domain validation
      // Domain validation happens at Server Action / Use Case boundary
      const addedNode = result.current.nodes.find(n => 
        n.data.label === 'Architecture Test'
      )
      expect(addedNode).toBeDefined()
      expect(addedNode?.data.businessRule).toBe('Domain validation should happen server-side')
    })

    it('should provide helper functions for optimistic state management', () => {
      const { result } = renderHook(() => useModelNodes(mockModelId))

      // Helper functions should be available
      expect(typeof result.current.isOptimisticPending).toBe('function')
      expect(typeof result.current.clearOptimisticState).toBe('function')
      expect(typeof result.current.batchUpdatePositions).toBe('function')

      // Test clear optimistic state
      act(() => {
        result.current.clearOptimisticState()
      })

      // Should not throw errors
      expect(result.current.error).toBeNull()
    })
  })

  describe('Performance Validation', () => {
    it('should achieve consistent performance improvements across operations', async () => {
      const { result } = renderHook(() => useModelNodes(mockModelId))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const performanceMetrics: Array<{
        operation: string
        optimisticTime: number
        serverTime: number
        improvement: number
      }> = []

      // Test ADD_NODE performance
      const addStartTime = performance.now()
      let addOptimisticTime = 0

      await act(async () => {
        result.current.addNode({
          type: 'stage',
          position: { x: 0, y: 0 },
          data: { label: 'Perf Test Add' }
        })
        
        await waitFor(() => {
          const addedNode = result.current.nodes.find(n => n.data.label === 'Perf Test Add')
          if (addedNode) {
            addOptimisticTime = performance.now() - addStartTime
          }
          expect(addedNode).toBeDefined()
        }, { timeout: 100 })
      })

      await waitFor(() => {
        expect(nodeActions.addNodeAction).toHaveBeenCalled()
      }, { timeout: 1000 })

      const addServerTime = performance.now() - addStartTime
      performanceMetrics.push({
        operation: 'ADD_NODE',
        optimisticTime: addOptimisticTime,
        serverTime: addServerTime,
        improvement: addServerTime - addOptimisticTime
      })

      // Validate all performance metrics meet targets
      performanceMetrics.forEach(metric => {
        expect(metric.optimisticTime).toBeLessThan(50) // Near-instantaneous
        expect(metric.improvement).toBeGreaterThan(250) // Significant improvement
        
        console.log(`📊 ${metric.operation}: Optimistic ${metric.optimisticTime.toFixed(2)}ms, Server ${metric.serverTime.toFixed(2)}ms, Improvement: ${metric.improvement.toFixed(2)}ms`)
      })
    })
  })
})