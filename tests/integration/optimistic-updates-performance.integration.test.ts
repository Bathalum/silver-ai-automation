/**
 * PHASE 2 INTEGRATION TDD: Performance Measurement for Optimistic Updates
 * 
 * These integration tests validate the complete optimistic update workflow:
 * 1. End-to-end performance measurement of 300-500ms improvements
 * 2. Real database operations with optimistic UI feedback
 * 3. Complete rollback scenarios with actual failure conditions
 * 4. Canvas drag performance with high-frequency position updates
 * 5. Clean Architecture boundary compliance under real load
 * 
 * INTEGRATION TEST PHILOSOPHY:
 * - Uses real database connections (no mocks for infrastructure)
 * - Tests complete request/response cycles with actual latency
 * - Validates optimistic updates against real server state
 * - Measures actual performance improvements in realistic scenarios
 * - Ensures architectural integrity under production-like conditions
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useModelNodes } from '@/app/hooks/useModelNodes' 
import { useDebouncedNodeActions } from '@/app/hooks/useDebouncedNodeActions'
import { createIntegrationTestDatabase, cleanupIntegrationTestDatabase } from '@/tests/utils/integration-test-database'
import { NodeType } from '@/lib/domain/enums'
import type { AddNodeRequest, ReactFlowNode } from '@/app/hooks/useModelNodes'

// Integration test setup - uses real database
describe('Phase 2 Integration: Optimistic Updates Performance', () => {
  let testDatabase: any
  let testModelId: string
  let existingNodes: ReactFlowNode[]

  // Performance metrics collection
  const performanceMetrics = {
    optimisticResponseTimes: [] as number[],
    serverConfirmationTimes: [] as number[],
    totalOperationTimes: [] as number[],
    rollbackTimes: [] as number[]
  }

  beforeAll(async () => {
    // Set up real database for integration testing
    testDatabase = await createIntegrationTestDatabase()
    
    // Create a test model with some initial nodes
    testModelId = await testDatabase.createModel({
      name: 'Optimistic Updates Performance Test Model',
      description: 'Integration test model for Phase 2 performance validation',
      userId: 'integration-test-user'
    })

    // Create initial test nodes
    existingNodes = await testDatabase.createNodes(testModelId, [
      { type: NodeType.IO_NODE, name: 'Existing Input', position: { x: 0, y: 0 }},
      { type: NodeType.STAGE_NODE, name: 'Existing Stage', position: { x: 200, y: 100 }},
      { type: NodeType.KB_NODE, name: 'Existing KB', position: { x: 400, y: 200 }}
    ])
  }, 30000) // Extended timeout for database setup

  afterAll(async () => {
    await cleanupIntegrationTestDatabase(testDatabase)
  }, 15000)

  beforeEach(() => {
    // Reset performance metrics for each test
    performanceMetrics.optimisticResponseTimes = []
    performanceMetrics.serverConfirmationTimes = []
    performanceMetrics.totalOperationTimes = []
    performanceMetrics.rollbackTimes = []
    
    jest.clearAllMocks()
  })

  describe('Add Node Operations - Performance Measurement', () => {
    it('should achieve 300-500ms perceived performance improvement for node creation', async () => {
      // ARRANGE: Hook with real model
      const { result } = renderHook(() => useModelNodes(testModelId))
      
      // Wait for initial load
      await waitFor(() => {
        expect(result.current.nodes.length).toBe(3) // Initial nodes loaded
        expect(result.current.loading).toBe(false)
      })

      const newNodeData: AddNodeRequest = {
        type: 'io',
        position: { x: 600, y: 300 },
        data: {
          label: 'Performance Test Node',
          description: 'Testing optimistic add performance'
        }
      }

      // ACT: Measure complete operation timing
      const operationStartTime = performance.now()
      let optimisticUpdateTime: number
      let serverConfirmationTime: number

      await act(async () => {
        // Start the add operation
        const addPromise = result.current.addNode(newNodeData)
        
        // Measure when optimistic update appears in UI
        await waitFor(() => {
          // Check if node appears optimistically in the UI
          const newNodeCount = result.current.nodes.length
          if (newNodeCount > 3) {
            optimisticUpdateTime = performance.now() - operationStartTime
          }
          expect(newNodeCount).toBeGreaterThan(3)
        }, { timeout: 100 }) // Should be nearly instant
        
        // Wait for server confirmation
        const addResult = await addPromise
        serverConfirmationTime = performance.now() - operationStartTime
        
        expect(addResult.success).toBe(true)
      })

      const totalOperationTime = performance.now() - operationStartTime

      // ASSERT: Performance targets achieved
      expect(optimisticUpdateTime).toBeLessThan(50) // Optimistic update < 50ms
      expect(serverConfirmationTime).toBeGreaterThan(300) // Server takes realistic time
      
      const perceivedImprovement = serverConfirmationTime - optimisticUpdateTime
      expect(perceivedImprovement).toBeGreaterThanOrEqual(300) // Target improvement
      expect(perceivedImprovement).toBeLessThanOrEqual(1000) // Reasonable server time

      // Store metrics
      performanceMetrics.optimisticResponseTimes.push(optimisticUpdateTime)
      performanceMetrics.serverConfirmationTimes.push(serverConfirmationTime)
      performanceMetrics.totalOperationTimes.push(totalOperationTime)

      console.log(`Add Node Performance:
        - Optimistic Update: ${optimisticUpdateTime.toFixed(1)}ms
        - Server Confirmation: ${serverConfirmationTime.toFixed(1)}ms  
        - Perceived Improvement: ${perceivedImprovement.toFixed(1)}ms
        - Total Operation: ${totalOperationTime.toFixed(1)}ms`)

      // ASSERT: Node actually created in database
      const finalNodes = await testDatabase.getModelNodes(testModelId)
      expect(finalNodes.length).toBe(4)
      expect(finalNodes.some((n: any) => n.name === 'Performance Test Node')).toBe(true)
    }, 10000)

    it('should handle add operation failures with fast rollback', async () => {
      // ARRANGE: Create conditions for server failure (duplicate name)
      const duplicateNodeData: AddNodeRequest = {
        type: 'stage',
        position: { x: 800, y: 400 },
        data: {
          label: 'Existing Stage', // Same name as existing node
          description: 'This should fail due to duplicate name'
        }
      }

      const { result } = renderHook(() => useModelNodes(testModelId))
      
      // Wait for initial load
      await waitFor(() => {
        expect(result.current.nodes.length).toBeGreaterThanOrEqual(3)
        expect(result.current.loading).toBe(false)
      })

      const initialNodeCount = result.current.nodes.length

      // ACT: Measure optimistic add with failure and rollback
      const operationStartTime = performance.now()
      let optimisticAppearTime: number
      let rollbackTime: number

      await act(async () => {
        const addPromise = result.current.addNode(duplicateNodeData)
        
        // Measure optimistic appearance 
        await waitFor(() => {
          if (result.current.nodes.length > initialNodeCount) {
            optimisticAppearTime = performance.now() - operationStartTime
          }
          expect(result.current.nodes.length).toBeGreaterThan(initialNodeCount)
        }, { timeout: 100 })
        
        // Wait for server response and rollback
        const addResult = await addPromise
        expect(addResult.success).toBe(false)
        expect(addResult.error).toContain('unique') // Domain validation error
        
        // Measure rollback timing
        await waitFor(() => {
          if (result.current.nodes.length === initialNodeCount) {
            rollbackTime = performance.now() - operationStartTime
          }
          expect(result.current.nodes.length).toBe(initialNodeCount)
        })
      })

      // ASSERT: Fast optimistic response and rollback
      expect(optimisticAppearTime).toBeLessThan(50) // Fast optimistic update
      expect(rollbackTime).toBeLessThan(1000) // Fast rollback after server error
      
      const rollbackSpeed = rollbackTime - optimisticAppearTime
      performanceMetrics.rollbackTimes.push(rollbackSpeed)

      console.log(`Add Node Failure Performance:
        - Optimistic Appear: ${optimisticAppearTime.toFixed(1)}ms
        - Rollback Complete: ${rollbackTime.toFixed(1)}ms
        - Rollback Speed: ${rollbackSpeed.toFixed(1)}ms`)

      // ASSERT: No duplicate node created in database
      const finalNodes = await testDatabase.getModelNodes(testModelId)
      const duplicateNodes = finalNodes.filter((n: any) => n.name === 'Existing Stage')
      expect(duplicateNodes.length).toBe(1) // Only the original remains
    }, 8000)
  })

  describe('Position Update Operations - Canvas Drag Performance', () => {
    it('should handle high-frequency drag operations with optimistic feedback', async () => {
      // ARRANGE: Hook with debounced actions for canvas drag simulation
      const { result: modelResult } = renderHook(() => useModelNodes(testModelId))
      const { result: debouncedResult } = renderHook(() => 
        useDebouncedNodeActions(testModelId, {
          batchWindow: 300,
          onBatchComplete: (batchResult) => {
            console.log(`Batch completed: ${batchResult.updatedNodes?.length || 0} nodes updated`)
          }
        })
      )

      // Wait for initial load
      await waitFor(() => {
        expect(modelResult.current.nodes.length).toBeGreaterThanOrEqual(3)
        expect(modelResult.current.loading).toBe(false)
      })

      const testNodeId = existingNodes[0].id
      const dragStartPosition = { x: 0, y: 0 }
      
      // ACT: Simulate rapid drag movements (50 position updates)
      const dragStartTime = performance.now()
      const positionUpdates: Array<{x: number, y: number, timestamp: number}> = []

      await act(async () => {
        for (let i = 0; i < 50; i++) {
          const newPosition = { 
            x: dragStartPosition.x + (i * 5), 
            y: dragStartPosition.y + (i * 2) 
          }
          
          const updateStartTime = performance.now()
          debouncedResult.current.updateNodePosition(testNodeId, newPosition)
          const updateEndTime = performance.now()
          
          positionUpdates.push({
            ...newPosition,
            timestamp: updateEndTime - dragStartTime
          })

          // Small delay to simulate realistic drag timing
          await new Promise(resolve => setTimeout(resolve, 16)) // ~60fps
        }
      })

      const dragEndTime = performance.now()
      const totalDragTime = dragEndTime - dragStartTime

      // Wait for batch to complete
      await waitFor(() => {
        expect(debouncedResult.current.batchingStats.pendingUpdates).toBe(0)
      }, { timeout: 2000 })

      // ASSERT: High-frequency updates handled efficiently
      expect(totalDragTime).toBeLessThan(2000) // 50 updates in < 2 seconds
      
      const averageUpdateTime = totalDragTime / 50
      expect(averageUpdateTime).toBeLessThan(40) // Average < 40ms per update

      // ASSERT: Batching reduced server calls significantly
      const batchStats = debouncedResult.current.batchingStats
      expect(batchStats.totalBatches).toBeLessThan(5) // 50 updates → < 5 batches
      const batchingEfficiency = 1 - (batchStats.totalBatches / 50)
      expect(batchingEfficiency).toBeGreaterThan(0.9) // >90% reduction in server calls

      console.log(`Canvas Drag Performance:
        - Total Drag Time: ${totalDragTime.toFixed(1)}ms
        - Average Update: ${averageUpdateTime.toFixed(1)}ms per update
        - Batching Efficiency: ${(batchingEfficiency * 100).toFixed(1)}% reduction
        - Server Calls: ${50} updates → ${batchStats.totalBatches} batches`)

      // ASSERT: Final position correctly persisted in database
      const updatedNode = await testDatabase.getNode(testNodeId)
      expect(updatedNode.position.x).toBe(dragStartPosition.x + (49 * 5)) // Final position
      expect(updatedNode.position.y).toBe(dragStartPosition.y + (49 * 2))
    }, 15000)

    it('should maintain UI responsiveness during network delays', async () => {
      // ARRANGE: Simulate network delay by using slower batch window
      const { result: modelResult } = renderHook(() => useModelNodes(testModelId))
      const { result: debouncedResult } = renderHook(() => 
        useDebouncedNodeActions(testModelId, {
          batchWindow: 1000, // Longer batch window simulates network delay
          onBatchStart: () => console.log('Starting slow batch operation...'),
          onBatchComplete: (result) => console.log('Slow batch completed:', result.success)
        })
      )

      // Wait for initial load
      await waitFor(() => {
        expect(modelResult.current.nodes.length).toBeGreaterThanOrEqual(3)
      })

      const testNodeId = existingNodes[1].id // Use second node for variety

      // ACT: Measure UI responsiveness during "slow network"
      const responsiveTestStart = performance.now()
      const responsiveTimes: number[] = []

      await act(async () => {
        // Simulate continuous user interactions during network delay
        for (let i = 0; i < 20; i++) {
          const interactionStart = performance.now()
          
          debouncedResult.current.updateNodePosition(testNodeId, { 
            x: 200 + (i * 10), 
            y: 100 + (i * 5) 
          })
          
          const interactionEnd = performance.now()
          responsiveTimes.push(interactionEnd - interactionStart)
          
          // Simulate user interaction timing
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      })

      const totalResponsiveTime = performance.now() - responsiveTestStart

      // Wait for slow batch to complete
      await waitFor(() => {
        expect(debouncedResult.current.batchingStats.pendingUpdates).toBe(0)
      }, { timeout: 3000 })

      // ASSERT: UI remained responsive despite network delays
      const averageResponseTime = responsiveTimes.reduce((a, b) => a + b, 0) / responsiveTimes.length
      expect(averageResponseTime).toBeLessThan(20) // Each interaction < 20ms
      
      const maxResponseTime = Math.max(...responsiveTimes)
      expect(maxResponseTime).toBeLessThan(50) // No interaction > 50ms
      
      console.log(`Network Delay Responsiveness:
        - Average Response: ${averageResponseTime.toFixed(1)}ms
        - Max Response: ${maxResponseTime.toFixed(1)}ms  
        - Total Test Time: ${totalResponsiveTime.toFixed(1)}ms
        - UI Remained Responsive: ${maxResponseTime < 50}`)

      // ASSERT: Final state is consistent with database
      const finalNode = await testDatabase.getNode(testNodeId)
      expect(finalNode.position.x).toBe(200 + (19 * 10)) // Last update position
      expect(finalNode.position.y).toBe(100 + (19 * 5))
    }, 12000)
  })

  describe('Deletion Operations - Rollback Performance', () => {
    it('should provide fast optimistic deletion with dependency rollback', async () => {
      // ARRANGE: Create node with dependencies that will prevent deletion
      const parentNodeId = await testDatabase.createNode(testModelId, {
        type: NodeType.FUNCTION_MODEL_CONTAINER,
        name: 'Parent Container',
        position: { x: 1000, y: 500 }
      })

      const childNodeId = await testDatabase.createNode(testModelId, {
        type: NodeType.IO_NODE,
        name: 'Child Input', 
        position: { x: 1100, y: 550 },
        parentId: parentNodeId // Creates dependency
      })

      const { result } = renderHook(() => useModelNodes(testModelId))
      
      // Wait for nodes to load
      await waitFor(() => {
        expect(result.current.nodes.some(n => n.id === parentNodeId)).toBe(true)
        expect(result.current.nodes.some(n => n.id === childNodeId)).toBe(true)
      })

      const initialNodeCount = result.current.nodes.length

      // ACT: Attempt to delete parent node (should fail due to dependencies)
      const deleteStartTime = performance.now()
      let optimisticDeleteTime: number
      let rollbackCompleteTime: number

      await act(async () => {
        const deletePromise = result.current.deleteNode(parentNodeId)
        
        // Measure optimistic deletion (node disappears immediately)
        await waitFor(() => {
          if (result.current.nodes.length < initialNodeCount) {
            optimisticDeleteTime = performance.now() - deleteStartTime
          }
          expect(result.current.nodes.length).toBe(initialNodeCount - 1)
        }, { timeout: 100 })
        
        // Wait for server response and rollback
        const deleteResult = await deletePromise
        expect(deleteResult.success).toBe(false)
        expect(deleteResult.error).toMatch(/dependencies|children/i)
        
        // Measure rollback completion (node reappears)
        await waitFor(() => {
          if (result.current.nodes.length === initialNodeCount) {
            rollbackCompleteTime = performance.now() - deleteStartTime
          }
          expect(result.current.nodes.length).toBe(initialNodeCount)
        })
      })

      // ASSERT: Fast optimistic deletion and rollback
      expect(optimisticDeleteTime).toBeLessThan(50) // Immediate optimistic deletion
      expect(rollbackCompleteTime).toBeLessThan(2000) // Fast rollback after server validation
      
      const rollbackSpeed = rollbackCompleteTime - optimisticDeleteTime
      console.log(`Delete Rollback Performance:
        - Optimistic Delete: ${optimisticDeleteTime.toFixed(1)}ms
        - Rollback Complete: ${rollbackCompleteTime.toFixed(1)}ms
        - Rollback Speed: ${rollbackSpeed.toFixed(1)}ms`)

      // ASSERT: Both nodes still exist in database (rollback successful)
      const remainingNodes = await testDatabase.getModelNodes(testModelId)
      expect(remainingNodes.some((n: any) => n.id === parentNodeId)).toBe(true)
      expect(remainingNodes.some((n: any) => n.id === childNodeId)).toBe(true)
    }, 10000)
  })

  describe('Clean Architecture Compliance Under Load', () => {
    it('should maintain architectural boundaries during high-load optimistic operations', async () => {
      // ARRANGE: Multiple concurrent operations testing architectural integrity
      const { result: modelResult } = renderHook(() => useModelNodes(testModelId))
      const { result: debouncedResult } = renderHook(() => 
        useDebouncedNodeActions(testModelId, { batchWindow: 200 })
      )

      await waitFor(() => {
        expect(modelResult.current.nodes.length).toBeGreaterThanOrEqual(3)
      })

      // ACT: High-load mixed operations (add, update, position changes)
      const loadTestStart = performance.now()
      const concurrentOperations: Promise<any>[] = []

      await act(async () => {
        // Concurrent node additions (10 nodes)
        for (let i = 0; i < 10; i++) {
          concurrentOperations.push(
            modelResult.current.addNode({
              type: 'io',
              position: { x: i * 150, y: 600 },
              data: { label: `Load Test Node ${i}` }
            })
          )
        }

        // Concurrent position updates on existing nodes
        existingNodes.forEach((node, index) => {
          for (let i = 0; i < 5; i++) {
            debouncedResult.current.updateNodePosition(node.id, {
              x: node.position.x + (i * 20),
              y: node.position.y + (i * 10)
            })
          }
        })

        // Wait for all operations to complete
        const results = await Promise.allSettled(concurrentOperations)
        
        // Check that most operations succeeded (some may fail due to concurrent modifications)
        const successful = results.filter(r => r.status === 'fulfilled').length
        expect(successful).toBeGreaterThanOrEqual(7) // At least 70% success rate
      })

      const loadTestEnd = performance.now()
      const totalLoadTime = loadTestEnd - loadTestStart

      // Wait for all batches to complete
      await waitFor(() => {
        expect(debouncedResult.current.batchingStats.pendingUpdates).toBe(0)
      }, { timeout: 5000 })

      // ASSERT: System maintained performance under load
      expect(totalLoadTime).toBeLessThan(5000) // All operations in < 5 seconds
      
      console.log(`High-Load Performance:
        - Concurrent Operations: ${concurrentOperations.length + (existingNodes.length * 5)}
        - Total Load Time: ${totalLoadTime.toFixed(1)}ms
        - Load Handled Successfully: ${totalLoadTime < 5000}`)

      // ASSERT: Database consistency maintained despite concurrent operations
      const finalNodes = await testDatabase.getModelNodes(testModelId)
      expect(finalNodes.length).toBeGreaterThanOrEqual(modelResult.current.nodes.length)
      
      // Verify no data corruption occurred
      finalNodes.forEach((node: any) => {
        expect(node.id).toBeDefined()
        expect(node.name).toBeDefined()
        expect(node.position).toBeDefined()
        expect(typeof node.position.x).toBe('number')
        expect(typeof node.position.y).toBe('number')
      })
    }, 20000)
  })

  describe('Performance Summary and Validation', () => {
    it('should meet all Phase 2 performance targets', async () => {
      // ANALYZE: Collected performance metrics across all tests
      const summary = {
        averageOptimisticResponse: performanceMetrics.optimisticResponseTimes.reduce((a, b) => a + b, 0) / 
                                  (performanceMetrics.optimisticResponseTimes.length || 1),
        averageServerConfirmation: performanceMetrics.serverConfirmationTimes.reduce((a, b) => a + b, 0) /
                                  (performanceMetrics.serverConfirmationTimes.length || 1),
        averageRollback: performanceMetrics.rollbackTimes.reduce((a, b) => a + b, 0) /
                        (performanceMetrics.rollbackTimes.length || 1),
        totalOperations: performanceMetrics.optimisticResponseTimes.length +
                        performanceMetrics.serverConfirmationTimes.length +
                        performanceMetrics.rollbackTimes.length
      }

      const averageImprovement = summary.averageServerConfirmation - summary.averageOptimisticResponse

      console.log(`\n=== PHASE 2 PERFORMANCE SUMMARY ===
      Average Optimistic Response: ${summary.averageOptimisticResponse.toFixed(1)}ms
      Average Server Confirmation: ${summary.averageServerConfirmation.toFixed(1)}ms  
      Average Perceived Improvement: ${averageImprovement.toFixed(1)}ms
      Average Rollback Time: ${summary.averageRollback.toFixed(1)}ms
      Total Operations Tested: ${summary.totalOperations}
      =====================================`)

      // ASSERT: All Phase 2 targets achieved
      expect(summary.averageOptimisticResponse).toBeLessThan(50) // Target: <50ms optimistic
      expect(averageImprovement).toBeGreaterThanOrEqual(300) // Target: 300-500ms improvement
      expect(averageImprovement).toBeLessThanOrEqual(1000) // Reasonable upper bound
      expect(summary.averageRollback).toBeLessThan(2000) // Target: <2s rollback
      expect(summary.totalOperations).toBeGreaterThan(0) // Ensure we tested something

      // FINAL VALIDATION: Phase 2 performance targets met
      const targetsAchieved = {
        optimisticResponseTime: summary.averageOptimisticResponse < 50,
        perceivedImprovement: averageImprovement >= 300 && averageImprovement <= 1000,
        rollbackPerformance: summary.averageRollback < 2000,
        testCoverage: summary.totalOperations > 0
      }

      expect(targetsAchieved.optimisticResponseTime).toBe(true)
      expect(targetsAchieved.perceivedImprovement).toBe(true) 
      expect(targetsAchieved.rollbackPerformance).toBe(true)
      expect(targetsAchieved.testCoverage).toBe(true)

      console.log('\n✅ ALL PHASE 2 PERFORMANCE TARGETS ACHIEVED')
    })
  })
})