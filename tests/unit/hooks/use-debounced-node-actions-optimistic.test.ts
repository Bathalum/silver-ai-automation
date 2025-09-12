/**
 * PHASE 2 TDD: Enhanced useDebouncedNodeActions with Optimistic Batch Operations
 * 
 * These tests define the expected behavior for Phase 2 batch operations:
 * 1. Optimistic batch updates with immediate UI feedback
 * 2. Intelligent batching that respects React 19's useOptimistic patterns
 * 3. Rollback strategies for partial batch failures
 * 4. Performance optimization through reduced server round-trips
 * 5. Clean Architecture compliance for batch processing workflows
 * 
 * CLEAN ARCHITECTURE BOUNDARY ENFORCEMENT:
 * - Batch operations remain within Interface Adapter layer
 * - Server Actions handle transaction boundaries properly
 * - Use Case layer processes batch operations atomically
 * - Domain rules enforced consistently across batch items
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebouncedNodeActions } from '@/app/hooks/useDebouncedNodeActions'
import * as nodeActions from '@/app/actions/node-actions'

// Mock the server actions
jest.mock('@/app/actions/node-actions', () => ({
  batchUpdateNodePositionsAction: jest.fn(),
  batchCreateNodesAction: jest.fn(), // New batch create action
  batchUpdateNodesAction: jest.fn(),  // New batch update action
  batchDeleteNodesAction: jest.fn()   // New batch delete action
}))

// Mock React 19's useOptimistic hook for batch operations
const mockUseOptimistic = jest.fn()
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useOptimistic: mockUseOptimistic
}))

describe('Phase 2: Enhanced useDebouncedNodeActions with Optimistic Batching', () => {
  const mockModelId = 'batch-test-model'
  let mockOptimisticState: any[]
  let mockOptimisticDispatch: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Set up optimistic state for batch operations
    mockOptimisticState = []
    mockOptimisticDispatch = jest.fn()
    mockUseOptimistic.mockReturnValue([mockOptimisticState, mockOptimisticDispatch])
    
    // Default successful batch responses
    ;(nodeActions.batchUpdateNodePositionsAction as jest.Mock).mockResolvedValue({
      success: true,
      updatedNodes: []
    })
    
    ;(nodeActions.batchCreateNodesAction as jest.Mock).mockResolvedValue({
      success: true,
      createdNodes: []
    })
    
    ;(nodeActions.batchUpdateNodesAction as jest.Mock).mockResolvedValue({
      success: true,
      updatedNodes: []
    })
    
    ;(nodeActions.batchDeleteNodesAction as jest.Mock).mockResolvedValue({
      success: true,
      deletedNodeIds: []
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Optimistic Batch Position Updates', () => {
    it('should provide immediate optimistic feedback for batch position updates', async () => {
      // ARRANGE: Hook with batch window
      const batchCallbacks = {
        onBatchStart: jest.fn(),
        onBatchComplete: jest.fn(),
        onBatchError: jest.fn()
      }

      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 300,
          enableOptimisticUpdates: true, // New option for Phase 2
          ...batchCallbacks
        })
      )

      // ACT: Rapid position updates that should batch with optimistic feedback
      await act(async () => {
        result.current.updateNodePosition('node-1', { x: 100, y: 100 })
        result.current.updateNodePosition('node-2', { x: 200, y: 200 })
        result.current.updateNodePosition('node-3', { x: 300, y: 300 })
      })

      // ASSERT: Immediate optimistic updates for each position change
      expect(mockOptimisticDispatch).toHaveBeenCalledTimes(3)
      
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'BATCH_UPDATE_POSITIONS',
        payload: {
          updates: [
            { nodeId: 'node-1', position: { x: 100, y: 100 }, optimistic: true }
          ]
        }
      })

      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'BATCH_UPDATE_POSITIONS', 
        payload: {
          updates: [
            { nodeId: 'node-1', position: { x: 100, y: 100 }, optimistic: true },
            { nodeId: 'node-2', position: { x: 200, y: 200 }, optimistic: true }
          ]
        }
      })

      // ASSERT: Batch should be queued but not executed yet
      expect(nodeActions.batchUpdateNodePositionsAction).not.toHaveBeenCalled()
      expect(batchCallbacks.onBatchStart).not.toHaveBeenCalled()

      // ACT: Advance timer to trigger batch
      jest.advanceTimersByTime(300)
      await waitFor(() => {
        expect(nodeActions.batchUpdateNodePositionsAction).toHaveBeenCalled()
      })

      // ASSERT: Batch executed with all 3 position updates
      expect(nodeActions.batchUpdateNodePositionsAction).toHaveBeenCalledWith(mockModelId, [
        { nodeId: 'node-1', position: { x: 100, y: 100 }},
        { nodeId: 'node-2', position: { x: 200, y: 200 }},
        { nodeId: 'node-3', position: { x: 300, y: 300 }}
      ])

      expect(batchCallbacks.onBatchStart).toHaveBeenCalled()
    })

    it('should handle batch position update failures with selective rollback', async () => {
      // ARRANGE: Partial batch failure response
      ;(nodeActions.batchUpdateNodePositionsAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Partial batch failure',
        successfulUpdates: [
          { nodeId: 'node-1', position: { x: 150, y: 150 }}
        ],
        failedUpdates: [
          { nodeId: 'node-2', error: 'Invalid position coordinates' },
          { nodeId: 'node-3', error: 'Node not found' }
        ]
      })

      const batchCallbacks = {
        onBatchError: jest.fn()
      }

      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 200,
          enableOptimisticUpdates: true,
          ...batchCallbacks
        })
      )

      // ACT: Mixed valid/invalid batch updates
      await act(async () => {
        result.current.updateNodePosition('node-1', { x: 150, y: 150 }) // Will succeed
        result.current.updateNodePosition('node-2', { x: -50, y: -50 })  // Invalid coordinates
        result.current.updateNodePosition('node-3', { x: 250, y: 250 })  // Node doesn't exist
      })

      // All updates should be optimistic initially
      expect(mockOptimisticDispatch).toHaveBeenCalledTimes(3)

      // ACT: Trigger batch execution
      jest.advanceTimersByTime(200)
      await waitFor(() => {
        expect(nodeActions.batchUpdateNodePositionsAction).toHaveBeenCalled()
      })

      // ASSERT: Selective rollback for failed items only
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ROLLBACK_BATCH_POSITIONS',
        payload: {
          rollbackUpdates: [
            { nodeId: 'node-2', error: 'Invalid position coordinates' },
            { nodeId: 'node-3', error: 'Node not found' }
          ],
          successfulUpdates: [
            { nodeId: 'node-1', position: { x: 150, y: 150 }}
          ]
        }
      })

      expect(batchCallbacks.onBatchError).toHaveBeenCalledWith({
        type: 'PARTIAL_BATCH_FAILURE',
        failedCount: 2,
        successfulCount: 1,
        errors: expect.any(Array)
      })
    })
  })

  describe('Optimistic Batch Node Creation', () => {
    it('should batch multiple node creations with immediate optimistic display', async () => {
      // ARRANGE: Successful batch creation response
      ;(nodeActions.batchCreateNodesAction as jest.Mock).mockResolvedValue({
        success: true,
        createdNodes: [
          { nodeId: 'new-node-1', type: 'io', position: { x: 0, y: 0 }},
          { nodeId: 'new-node-2', type: 'stage', position: { x: 100, y: 0 }},
          { nodeId: 'new-node-3', type: 'kb', position: { x: 200, y: 0 }}
        ]
      })

      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 250,
          enableOptimisticUpdates: true,
          maxBatchSize: 10 // New option for controlling batch size
        })
      )

      // ACT: Rapid node creations (e.g., copy-paste operation)
      await act(async () => {
        result.current.batchCreateNodes([
          {
            type: 'io',
            position: { x: 0, y: 0 },
            data: { label: 'Batch IO 1' }
          },
          {
            type: 'stage', 
            position: { x: 100, y: 0 },
            data: { label: 'Batch Stage 1' }
          },
          {
            type: 'kb',
            position: { x: 200, y: 0 },
            data: { label: 'Batch KB 1' }
          }
        ])
      })

      // ASSERT: Immediate optimistic creation
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'BATCH_CREATE_NODES',
        payload: {
          nodes: [
            {
              id: expect.stringMatching(/^optimistic-/), // Temporary optimistic ID
              type: 'io',
              position: { x: 0, y: 0 },
              data: { label: 'Batch IO 1', optimistic: true }
            },
            {
              id: expect.stringMatching(/^optimistic-/),
              type: 'stage',
              position: { x: 100, y: 0 },
              data: { label: 'Batch Stage 1', optimistic: true }
            },
            {
              id: expect.stringMatching(/^optimistic-/),
              type: 'kb',
              position: { x: 200, y: 0 },
              data: { label: 'Batch KB 1', optimistic: true }
            }
          ]
        }
      })

      // ACT: Trigger batch execution
      jest.advanceTimersByTime(250)
      await waitFor(() => {
        expect(nodeActions.batchCreateNodesAction).toHaveBeenCalled()
      })

      // ASSERT: Optimistic IDs replaced with real IDs
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'REPLACE_OPTIMISTIC_NODES',
        payload: {
          optimisticToRealMapping: [
            { optimisticId: expect.any(String), realId: 'new-node-1' },
            { optimisticId: expect.any(String), realId: 'new-node-2' },
            { optimisticId: expect.any(String), realId: 'new-node-3' }
          ]
        }
      })
    })

    it('should handle batch creation failures with complete rollback', async () => {
      // ARRANGE: Complete batch failure (e.g., transaction rollback)
      ;(nodeActions.batchCreateNodesAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database transaction failed - all creations rolled back',
        failedNodes: ['optimistic-1', 'optimistic-2']
      })

      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 100,
          enableOptimisticUpdates: true
        })
      )

      // ACT: Batch node creation that will fail
      await act(async () => {
        result.current.batchCreateNodes([
          {
            type: 'io',
            position: { x: 0, y: 0 },
            data: { label: 'Will Fail 1' }
          },
          {
            type: 'stage',
            position: { x: 100, y: 0 },
            data: { label: 'Will Fail 2' }
          }
        ])
      })

      // ASSERT: Optimistic creation occurs first
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'BATCH_CREATE_NODES',
        payload: {
          nodes: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({ optimistic: true })
            })
          ])
        }
      })

      // ACT: Trigger batch and wait for failure
      jest.advanceTimersByTime(100)
      await waitFor(() => {
        expect(nodeActions.batchCreateNodesAction).toHaveBeenCalled()
      })

      // ASSERT: Complete rollback of optimistic nodes
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ROLLBACK_BATCH_CREATION',
        payload: {
          rollbackNodes: expect.arrayContaining([
            expect.stringMatching(/^optimistic-/)
          ]),
          error: 'Database transaction failed - all creations rolled back'
        }
      })
    })
  })

  describe('Optimistic Batch Deletion Operations', () => {
    it('should provide immediate feedback for batch deletions with dependency checking', async () => {
      // ARRANGE: Batch deletion with dependency validation
      ;(nodeActions.batchDeleteNodesAction as jest.Mock).mockResolvedValue({
        success: true,
        deletedNodeIds: ['delete-1', 'delete-3'],
        skippedNodes: [
          { nodeId: 'delete-2', reason: 'Has dependencies - cannot delete' }
        ]
      })

      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 150,
          enableOptimisticUpdates: true,
          validateDependencies: true // New option for dependency checking
        })
      )

      // ACT: Batch delete operation
      await act(async () => {
        result.current.batchDeleteNodes(['delete-1', 'delete-2', 'delete-3'])
      })

      // ASSERT: Immediate optimistic removal (all nodes temporarily disappear)
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'BATCH_DELETE_NODES',
        payload: {
          nodeIds: ['delete-1', 'delete-2', 'delete-3'],
          optimistic: true
        }
      })

      // ACT: Execute batch with dependency validation
      jest.advanceTimersByTime(150)
      await waitFor(() => {
        expect(nodeActions.batchDeleteNodesAction).toHaveBeenCalled()
      })

      // ASSERT: Restore nodes that couldn't be deleted due to dependencies
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'RESTORE_PROTECTED_NODES', 
        payload: {
          restoredNodes: [
            { nodeId: 'delete-2', reason: 'Has dependencies - cannot delete' }
          ],
          actuallyDeleted: ['delete-1', 'delete-3']
        }
      })
    })
  })

  describe('Performance and Batching Intelligence', () => {
    it('should intelligently batch operations to minimize server round-trips', async () => {
      // ARRANGE: Hook with intelligent batching settings
      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 300,
          maxBatchSize: 50,
          enableIntelligentBatching: true, // Groups similar operations
          enableOptimisticUpdates: true
        })
      )

      // ACT: Mixed operation types that should be intelligently grouped
      await act(async () => {
        // Position updates (should batch together)
        result.current.updateNodePosition('pos-1', { x: 10, y: 10 })
        result.current.updateNodePosition('pos-2', { x: 20, y: 20 })
        
        // Node creations (should batch together)
        result.current.batchCreateNodes([
          { type: 'io', position: { x: 0, y: 0 }, data: { label: 'New 1' }}
        ])
        result.current.batchCreateNodes([
          { type: 'stage', position: { x: 100, y: 0 }, data: { label: 'New 2' }}
        ])
        
        // Deletions (should batch together)
        result.current.batchDeleteNodes(['del-1'])
        result.current.batchDeleteNodes(['del-2'])
      })

      // ASSERT: Each operation type should have optimistic updates
      expect(mockOptimisticDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BATCH_UPDATE_POSITIONS' })
      )
      expect(mockOptimisticDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BATCH_CREATE_NODES' })
      )
      expect(mockOptimisticDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BATCH_DELETE_NODES' })
      )

      // ACT: Trigger batch execution
      jest.advanceTimersByTime(300)
      
      await waitFor(() => {
        // Should make separate batched calls for each operation type
        expect(nodeActions.batchUpdateNodePositionsAction).toHaveBeenCalledTimes(1)
        expect(nodeActions.batchCreateNodesAction).toHaveBeenCalledTimes(1)
        expect(nodeActions.batchDeleteNodesAction).toHaveBeenCalledTimes(1)
      })

      // ASSERT: Total of 3 server calls instead of 6 individual calls
      // This represents a 50% reduction in server round-trips
    })

    it('should achieve target performance improvements through batching', async () => {
      // ARRANGE: Performance measurement setup
      const performanceMetrics = {
        optimisticResponseTimes: [] as number[],
        batchExecutionTimes: [] as number[],
        totalOperationCounts: 0
      }

      const onBatchComplete = jest.fn((result) => {
        performanceMetrics.totalOperationCounts += result.batchSize || 0
      })

      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 200,
          enableOptimisticUpdates: true,
          onBatchComplete
        })
      )

      // ACT: Simulate high-frequency operations (drag + multi-select operations)
      const operationStartTime = performance.now()
      
      await act(async () => {
        // Rapid position updates (simulating drag)
        for (let i = 0; i < 15; i++) {
          const updateStartTime = performance.now()
          result.current.updateNodePosition(`rapid-${i}`, { x: i * 10, y: i * 10 })
          const updateTime = performance.now() - updateStartTime
          performanceMetrics.optimisticResponseTimes.push(updateTime)
        }
      })

      const totalOptimisticTime = performance.now() - operationStartTime

      // ACT: Execute batch
      const batchStartTime = performance.now()
      jest.advanceTimersByTime(200)
      
      await waitFor(() => {
        expect(nodeActions.batchUpdateNodePositionsAction).toHaveBeenCalled()
      })
      
      const batchExecutionTime = performance.now() - batchStartTime
      performanceMetrics.batchExecutionTimes.push(batchExecutionTime)

      // ASSERT: Performance targets achieved
      const averageOptimisticTime = performanceMetrics.optimisticResponseTimes.reduce((a, b) => a + b, 0) / 15
      
      expect(averageOptimisticTime).toBeLessThan(10) // Each optimistic update < 10ms
      expect(totalOptimisticTime).toBeLessThan(100)  // All 15 updates in < 100ms
      
      // ASSERT: Server round-trip reduction
      expect(nodeActions.batchUpdateNodePositionsAction).toHaveBeenCalledTimes(1) // 15 operations → 1 batch call
      expect(onBatchComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          batchSize: 15
        })
      )

      // Performance improvement: 15 individual server calls → 1 batch call = 93% reduction
    })
  })

  describe('Clean Architecture Boundary Compliance', () => {
    it('should maintain architectural integrity during batch operations', async () => {
      // ARRANGE: Batch operations with business rule validation
      ;(nodeActions.batchCreateNodesAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Domain validation failed',
        validationErrors: [
          { nodeId: 'optimistic-1', field: 'name', message: 'Duplicate name not allowed' }
        ]
      })

      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 100,
          enableOptimisticUpdates: true
        })
      )

      // ACT: Batch creation with domain rule violation
      await act(async () => {
        result.current.batchCreateNodes([
          { type: 'io', position: { x: 0, y: 0 }, data: { label: 'Duplicate Name' }},
          { type: 'stage', position: { x: 100, y: 0 }, data: { label: 'Valid Name' }}
        ])
      })

      // ASSERT: Optimistic updates occur at Interface Adapter layer
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'BATCH_CREATE_NODES',
        payload: {
          nodes: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({ 
                label: 'Duplicate Name',
                optimistic: true // Interface layer flag only
              })
            })
          ])
        }
      })

      // ACT: Execute batch - domain validation happens at Use Case boundary
      jest.advanceTimersByTime(100)
      await waitFor(() => {
        expect(nodeActions.batchCreateNodesAction).toHaveBeenCalled()
      })

      // ASSERT: Domain validation enforced at proper architectural boundary
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ROLLBACK_BATCH_CREATION',
        payload: {
          rollbackNodes: expect.any(Array),
          domainErrors: [
            { nodeId: expect.any(String), field: 'name', message: 'Duplicate name not allowed' }
          ]
        }
      })

      // CLEAN ARCHITECTURE PRINCIPLE: 
      // - Optimistic updates happen in Interface Adapter (UI layer)
      // - Domain validation happens in Use Case layer via Server Action
      // - Business rules are not duplicated or bypassed in optimistic state
    })

    it('should ensure use case transaction integrity during batch failures', async () => {
      // ARRANGE: Partial batch failure that requires transaction rollback
      ;(nodeActions.batchUpdateNodePositionsAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Transaction rolled back due to constraint violation',
        partialFailure: true,
        affectedNodes: ['batch-1', 'batch-2', 'batch-3'],
        rollbackReason: 'One node position violates canvas boundaries'
      })

      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 150,
          enableOptimisticUpdates: true,
          enforceTransactionIntegrity: true // New option for use case consistency
        })
      )

      // ACT: Batch update with one invalid position that affects transaction
      await act(async () => {
        result.current.updateNodePosition('batch-1', { x: 100, y: 100 })   // Valid
        result.current.updateNodePosition('batch-2', { x: 200, y: 200 })   // Valid  
        result.current.updateNodePosition('batch-3', { x: -100, y: -100 }) // Invalid - outside canvas
      })

      // All should be optimistic initially
      expect(mockOptimisticDispatch).toHaveBeenCalledTimes(3)

      // ACT: Execute batch with transaction failure
      jest.advanceTimersByTime(150)
      await waitFor(() => {
        expect(nodeActions.batchUpdateNodePositionsAction).toHaveBeenCalled()
      })

      // ASSERT: Complete transaction rollback maintains use case integrity
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'ROLLBACK_ENTIRE_BATCH',
        payload: {
          rollbackAllNodes: ['batch-1', 'batch-2', 'batch-3'],
          transactionError: 'Transaction rolled back due to constraint violation',
          reason: 'Use case requires all-or-nothing consistency'
        }
      })

      // CLEAN ARCHITECTURE PRINCIPLE:
      // Use case transaction boundaries are respected even during optimistic updates
      // Domain constraints apply to entire batch, not individual items
    })
  })

  describe('Edge Cases and Error Recovery', () => {
    it('should handle optimistic state corruption and auto-recovery', async () => {
      // ARRANGE: Simulate optimistic state getting out of sync
      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 200,
          enableOptimisticUpdates: true,
          autoRecoveryEnabled: true // New option for state recovery
        })
      )

      // ACT: Operations that create conflicting optimistic state
      await act(async () => {
        result.current.updateNodePosition('conflict-node', { x: 100, y: 100 })
        result.current.batchDeleteNodes(['conflict-node']) // Delete same node being moved
        result.current.updateNodePosition('conflict-node', { x: 200, y: 200 }) // Move deleted node
      })

      // ASSERT: Conflicting optimistic updates detected
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'DETECT_STATE_CONFLICT',
        payload: {
          conflictingOperations: [
            { type: 'UPDATE_POSITION', nodeId: 'conflict-node' },
            { type: 'DELETE_NODE', nodeId: 'conflict-node' },
            { type: 'UPDATE_POSITION', nodeId: 'conflict-node' }
          ]
        }
      })

      // ACT: Auto-recovery should trigger
      jest.advanceTimersByTime(200)
      
      // ASSERT: State recovery mechanism activated
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'TRIGGER_STATE_RECOVERY',
        payload: {
          recoveryStrategy: 'RESET_OPTIMISTIC_STATE',
          conflictResolution: 'SERVER_AUTHORITATIVE'
        }
      })
    })

    it('should maintain performance under high-load batch scenarios', async () => {
      // ARRANGE: High-volume batch operations
      const { result } = renderHook(() => 
        useDebouncedNodeActions(mockModelId, {
          batchWindow: 500,
          maxBatchSize: 100,
          enableOptimisticUpdates: true,
          performanceMode: 'HIGH_THROUGHPUT' // New option for large operations
        })
      )

      // ACT: Simulate large copy-paste operation (100 nodes)
      const largeOperationStartTime = performance.now()
      
      await act(async () => {
        const largeBatch = Array.from({length: 100}, (_, i) => ({
          type: 'io' as const,
          position: { x: (i % 10) * 50, y: Math.floor(i / 10) * 50 },
          data: { label: `Large Batch Node ${i}` }
        }))
        
        result.current.batchCreateNodes(largeBatch)
      })
      
      const optimisticResponseTime = performance.now() - largeOperationStartTime

      // ASSERT: Optimistic response remains fast even for large batches
      expect(optimisticResponseTime).toBeLessThan(200) // <200ms for 100 node optimistic update
      
      expect(mockOptimisticDispatch).toHaveBeenCalledWith({
        type: 'BATCH_CREATE_NODES',
        payload: {
          nodes: expect.arrayContaining([
            expect.objectContaining({ data: expect.objectContaining({ optimistic: true }) })
          ])
        }
      })

      // ACT: Execute large batch
      jest.advanceTimersByTime(500)
      await waitFor(() => {
        expect(nodeActions.batchCreateNodesAction).toHaveBeenCalled()
      })

      // ASSERT: Single batch call handles 100 operations efficiently
      expect(nodeActions.batchCreateNodesAction).toHaveBeenCalledTimes(1)
      expect(nodeActions.batchCreateNodesAction).toHaveBeenCalledWith(
        mockModelId,
        expect.arrayContaining([
          expect.objectContaining({ type: 'io' })
        ])
      )
      
      // Performance: 100 individual server calls reduced to 1 batch = 99% reduction
    })
  })
})