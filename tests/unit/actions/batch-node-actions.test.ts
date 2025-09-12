/**
 * PHASE 2 TDD: Enhanced Batch Server Actions with Optimistic Support
 * 
 * These tests define the expected behavior for new batch Server Actions:
 * 1. batchCreateNodesAction for multi-node creation in single transaction
 * 2. batchUpdateNodesAction for multi-property updates across nodes
 * 3. batchDeleteNodesAction for multi-node deletion with dependency validation
 * 4. Enhanced batchUpdateNodePositionsAction with optimistic response format
 * 5. Transaction integrity and rollback behaviors for partial failures
 * 
 * CLEAN ARCHITECTURE BOUNDARY ENFORCEMENT:
 * - Server Actions remain in Interface Adapter layer
 * - Batch operations maintain single transaction boundaries
 * - Use Case layer handles batch processing atomically
 * - Domain rules applied consistently across batch items
 * - Error handling preserves architectural integrity
 */

import { batchCreateNodesAction, batchUpdateNodesAction, batchDeleteNodesAction, batchUpdateNodePositionsAction } from '@/app/actions/node-actions'
import { createClient } from '@/lib/supabase/server'
import { createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module'
import { ServiceTokens } from '@/lib/infrastructure/di/container'
import { NodeType } from '@/lib/domain/enums'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

// Mock DI container
jest.mock('@/lib/infrastructure/di/function-model-module', () => ({
  createFunctionModelContainer: jest.fn()
}))

describe('Phase 2: Batch Server Actions for Optimistic Updates', () => {
  let mockSupabaseClient: any
  let mockContainer: any
  let mockScope: any
  let mockManageNodesUseCase: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user', email: 'test@example.com' }},
          error: null
        })
      }
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    
    // Mock DI container and scope
    mockManageNodesUseCase = {
      batchCreateNodes: jest.fn(),
      batchUpdateNodes: jest.fn(),
      batchDeleteNodes: jest.fn(),
      batchUpdatePositions: jest.fn()
    }
    
    mockScope = {
      resolve: jest.fn().mockResolvedValue({
        isFailure: false,
        value: mockManageNodesUseCase
      }),
      dispose: jest.fn()
    }
    
    mockContainer = {
      createScope: jest.fn().mockReturnValue(mockScope)
    }
    ;(createFunctionModelContainer as jest.Mock).mockResolvedValue(mockContainer)
  })

  describe('batchCreateNodesAction - New Batch Creation Server Action', () => {
    it('should create multiple nodes in single transaction with optimistic response format', async () => {
      // ARRANGE: Successful batch creation use case response
      const createdNodes = [
        { id: 'batch-node-1', type: 'io', position: { x: 0, y: 0 }, name: 'Batch IO 1' },
        { id: 'batch-node-2', type: 'stage', position: { x: 100, y: 0 }, name: 'Batch Stage 1' },
        { id: 'batch-node-3', type: 'kb', position: { x: 200, y: 0 }, name: 'Batch KB 1' }
      ]
      
      mockManageNodesUseCase.batchCreateNodes.mockResolvedValue({
        isFailure: false,
        value: { createdNodes }
      })

      const batchData = [
        {
          type: NodeType.IO_NODE,
          name: 'Batch IO 1',
          position: { x: 0, y: 0 },
          description: 'First batch node'
        },
        {
          type: NodeType.STAGE_NODE,
          name: 'Batch Stage 1', 
          position: { x: 100, y: 0 },
          description: 'Second batch node'
        },
        {
          type: NodeType.KB_NODE,
          name: 'Batch KB 1',
          position: { x: 200, y: 0 },
          description: 'Third batch node'
        }
      ]

      // ACT: Execute batch creation
      const result = await batchCreateNodesAction('test-model-123', batchData)

      // ASSERT: Successful batch response with optimistic-friendly format
      expect(result).toEqual({
        success: true,
        createdNodes: [
          {
            nodeId: 'batch-node-1',
            type: 'io',
            position: { x: 0, y: 0 },
            data: { label: 'Batch IO 1', description: 'First batch node' }
          },
          {
            nodeId: 'batch-node-2',
            type: 'stage',
            position: { x: 100, y: 0 },
            data: { label: 'Batch Stage 1', description: 'Second batch node' }
          },
          {
            nodeId: 'batch-node-3',
            type: 'kb',
            position: { x: 200, y: 0 },
            data: { label: 'Batch KB 1', description: 'Third batch node' }
          }
        ],
        batchSize: 3,
        transactionId: expect.any(String)
      })

      // ASSERT: Use case called with proper batch command
      expect(mockManageNodesUseCase.batchCreateNodes).toHaveBeenCalledWith({
        modelId: 'test-model-123',
        userId: 'test-user',
        nodesToCreate: batchData,
        transactionMode: 'ATOMIC' // All-or-nothing transaction
      })

      // ASSERT: Proper cleanup
      expect(mockScope.dispose).toHaveBeenCalled()
    })

    it('should handle batch creation failure with transaction rollback', async () => {
      // ARRANGE: Use case failure (e.g., one node violates domain rules)
      mockManageNodesUseCase.batchCreateNodes.mockResolvedValue({
        isFailure: true,
        error: 'Batch creation failed: Duplicate node name detected',
        details: {
          transactionRolledBack: true,
          failedNodes: [
            { index: 1, error: 'Node name "Duplicate" already exists' }
          ]
        }
      })

      const batchDataWithDuplicate = [
        { type: NodeType.IO_NODE, name: 'Unique Name', position: { x: 0, y: 0 }},
        { type: NodeType.STAGE_NODE, name: 'Duplicate', position: { x: 100, y: 0 }}, // Will fail
        { type: NodeType.KB_NODE, name: 'Another Unique', position: { x: 200, y: 0 }}
      ]

      // ACT: Execute failing batch creation
      const result = await batchCreateNodesAction('test-model-123', batchDataWithDuplicate)

      // ASSERT: Failure response with detailed error information for rollback
      expect(result).toEqual({
        success: false,
        error: 'Batch creation failed: Duplicate node name detected',
        batchSize: 3,
        failedNodes: [
          { index: 1, error: 'Node name "Duplicate" already exists' }
        ],
        transactionRolledBack: true,
        rollbackReason: 'Domain validation failed for batch items'
      })

      // ASSERT: No partial creation - complete transaction rollback
      expect(result.createdNodes).toBeUndefined()
    })

    it('should validate batch size limits and provide appropriate errors', async () => {
      // ARRANGE: Batch exceeding maximum size
      const oversizedBatch = Array.from({length: 101}, (_, i) => ({
        type: NodeType.IO_NODE,
        name: `Node ${i}`,
        position: { x: i * 10, y: 0 }
      }))

      // ACT: Attempt oversized batch creation
      const result = await batchCreateNodesAction('test-model-123', oversizedBatch)

      // ASSERT: Validation error before use case execution
      expect(result).toEqual({
        success: false,
        error: 'Batch size exceeds maximum limit of 100 nodes',
        batchSize: 101,
        validationErrors: [{
          field: 'batchSize',
          message: 'Maximum batch size is 100 nodes per operation'
        }]
      })

      // ASSERT: Use case not called for invalid batches
      expect(mockManageNodesUseCase.batchCreateNodes).not.toHaveBeenCalled()
    })
  })

  describe('batchUpdateNodesAction - New Batch Update Server Action', () => {
    it('should update multiple nodes with different properties in single transaction', async () => {
      // ARRANGE: Successful batch update use case response
      const updatedNodes = [
        { id: 'update-1', name: 'Updated Name 1', position: { x: 50, y: 50 }},
        { id: 'update-2', description: 'Updated Description', metadata: { priority: 'high' }},
        { id: 'update-3', position: { x: 150, y: 150 }}
      ]

      mockManageNodesUseCase.batchUpdateNodes.mockResolvedValue({
        isFailure: false,
        value: { updatedNodes }
      })

      const batchUpdates = [
        {
          nodeId: 'update-1',
          updates: { name: 'Updated Name 1', position: { x: 50, y: 50 }}
        },
        {
          nodeId: 'update-2', 
          updates: { description: 'Updated Description', metadata: { priority: 'high' }}
        },
        {
          nodeId: 'update-3',
          updates: { position: { x: 150, y: 150 }}
        }
      ]

      // ACT: Execute batch updates
      const result = await batchUpdateNodesAction('test-model-123', batchUpdates)

      // ASSERT: Successful batch update response
      expect(result).toEqual({
        success: true,
        updatedNodes: [
          {
            nodeId: 'update-1',
            updates: { name: 'Updated Name 1', position: { x: 50, y: 50 }}
          },
          {
            nodeId: 'update-2',
            updates: { description: 'Updated Description', metadata: { priority: 'high' }}
          },
          {
            nodeId: 'update-3',
            updates: { position: { x: 150, y: 150 }}
          }
        ],
        batchSize: 3,
        transactionId: expect.any(String)
      })

      // ASSERT: Use case called with proper batch command
      expect(mockManageNodesUseCase.batchUpdateNodes).toHaveBeenCalledWith({
        modelId: 'test-model-123',
        userId: 'test-user',
        nodeUpdates: batchUpdates,
        transactionMode: 'ATOMIC'
      })
    })

    it('should handle partial batch update failures with selective rollback', async () => {
      // ARRANGE: Partial failure (some nodes don't exist)
      mockManageNodesUseCase.batchUpdateNodes.mockResolvedValue({
        isFailure: false,
        value: {
          successfulUpdates: [
            { nodeId: 'exists-1', updates: { name: 'Successfully Updated' }}
          ],
          failedUpdates: [
            { nodeId: 'missing-1', error: 'Node not found' },
            { nodeId: 'invalid-2', error: 'Position coordinates out of bounds' }
          ]
        }
      })

      const mixedBatch = [
        { nodeId: 'exists-1', updates: { name: 'Successfully Updated' }},
        { nodeId: 'missing-1', updates: { name: 'This Will Fail' }},
        { nodeId: 'invalid-2', updates: { position: { x: -100, y: -100 }}} // Invalid
      ]

      // ACT: Execute mixed success/failure batch
      const result = await batchUpdateNodesAction('test-model-123', mixedBatch)

      // ASSERT: Partial success response for optimistic rollback handling
      expect(result).toEqual({
        success: true, // Overall success because some updates succeeded
        partialFailure: true,
        updatedNodes: [
          { nodeId: 'exists-1', updates: { name: 'Successfully Updated' }}
        ],
        failedNodes: [
          { nodeId: 'missing-1', error: 'Node not found' },
          { nodeId: 'invalid-2', error: 'Position coordinates out of bounds' }
        ],
        batchSize: 3,
        successfulCount: 1,
        failedCount: 2
      })
    })
  })

  describe('batchDeleteNodesAction - New Batch Deletion Server Action', () => {
    it('should delete multiple nodes with dependency validation', async () => {
      // ARRANGE: Successful batch deletion with dependency checking
      mockManageNodesUseCase.batchDeleteNodes.mockResolvedValue({
        isFailure: false,
        value: {
          deletedNodes: ['safe-1', 'safe-3'],
          protectedNodes: [
            { nodeId: 'protected-2', reason: 'Has child nodes - cannot delete' }
          ]
        }
      })

      const deletionBatch = ['safe-1', 'protected-2', 'safe-3']

      // ACT: Execute batch deletion
      const result = await batchDeleteNodesAction('test-model-123', deletionBatch, {
        validateDependencies: true,
        cascadeDelete: false
      })

      // ASSERT: Deletion response with dependency protection
      expect(result).toEqual({
        success: true,
        deletedNodeIds: ['safe-1', 'safe-3'],
        protectedNodes: [
          { nodeId: 'protected-2', reason: 'Has child nodes - cannot delete' }
        ],
        batchSize: 3,
        deletedCount: 2,
        protectedCount: 1
      })

      // ASSERT: Use case called with dependency validation
      expect(mockManageNodesUseCase.batchDeleteNodes).toHaveBeenCalledWith({
        modelId: 'test-model-123',
        userId: 'test-user',
        nodeIdsToDelete: deletionBatch,
        options: {
          validateDependencies: true,
          cascadeDelete: false,
          transactionMode: 'ATOMIC'
        }
      })
    })

    it('should handle cascade deletion for dependent nodes', async () => {
      // ARRANGE: Cascade deletion mode
      mockManageNodesUseCase.batchDeleteNodes.mockResolvedValue({
        isFailure: false,
        value: {
          deletedNodes: ['parent-1', 'child-1a', 'child-1b', 'standalone-2'],
          cascadedDeletions: [
            { parentNodeId: 'parent-1', deletedChildren: ['child-1a', 'child-1b'] }
          ]
        }
      })

      const cascadeBatch = ['parent-1', 'standalone-2']

      // ACT: Execute cascade deletion
      const result = await batchDeleteNodesAction('test-model-123', cascadeBatch, {
        validateDependencies: true,
        cascadeDelete: true
      })

      // ASSERT: Cascade deletion response 
      expect(result).toEqual({
        success: true,
        deletedNodeIds: ['parent-1', 'child-1a', 'child-1b', 'standalone-2'],
        cascadedDeletions: [
          { parentNodeId: 'parent-1', deletedChildren: ['child-1a', 'child-1b'] }
        ],
        batchSize: 2, // Original batch size
        totalDeleted: 4 // Including cascaded deletions
      })
    })

    it('should prevent batch deletion when would break model integrity', async () => {
      // ARRANGE: Use case prevents deletion that would break model
      mockManageNodesUseCase.batchDeleteNodes.mockResolvedValue({
        isFailure: true,
        error: 'Batch deletion would orphan critical model components',
        details: {
          integrityViolation: true,
          affectedComponents: ['main-workflow', 'critical-stage']
        }
      })

      const criticalBatch = ['main-input', 'processing-core', 'main-output']

      // ACT: Attempt deletion that would break model integrity
      const result = await batchDeleteNodesAction('test-model-123', criticalBatch)

      // ASSERT: Integrity protection prevents deletion
      expect(result).toEqual({
        success: false,
        error: 'Batch deletion would orphan critical model components',
        integrityViolation: true,
        affectedComponents: ['main-workflow', 'critical-stage'],
        protectedNodes: criticalBatch, // All nodes protected
        protectionReason: 'Model integrity preservation'
      })
    })
  })

  describe('Enhanced batchUpdateNodePositionsAction - Optimistic Response Format', () => {
    it('should provide optimistic-friendly response format for position batches', async () => {
      // ARRANGE: Successful position batch update
      mockManageNodesUseCase.batchUpdatePositions.mockResolvedValue({
        isFailure: false,
        value: [
          { id: 'pos-1', position: { x: 150, y: 150 }},
          { id: 'pos-2', position: { x: 250, y: 250 }},
          { id: 'pos-3', position: { x: 350, y: 350 }}
        ]
      })

      const positionUpdates = [
        { nodeId: 'pos-1', position: { x: 150, y: 150 }},
        { nodeId: 'pos-2', position: { x: 250, y: 250 }},
        { nodeId: 'pos-3', position: { x: 350, y: 350 }}
      ]

      // ACT: Execute enhanced batch position update
      const result = await batchUpdateNodePositionsAction('test-model-123', positionUpdates)

      // ASSERT: Enhanced response format for optimistic update compatibility
      expect(result).toEqual({
        success: true,
        updatedNodes: [
          { nodeId: 'pos-1', position: { x: 150, y: 150 }},
          { nodeId: 'pos-2', position: { x: 250, y: 250 }},
          { nodeId: 'pos-3', position: { x: 350, y: 350 }}
        ],
        batchSize: 3,
        batchExecutionTime: expect.any(Number), // Performance metric
        optimisticCompatible: true // Flag for UI layer
      })
    })

    it('should handle position validation failures with detailed rollback info', async () => {
      // ARRANGE: Position validation failures
      mockManageNodesUseCase.batchUpdatePositions.mockResolvedValue({
        isFailure: false,
        value: {
          successfulUpdates: [
            { id: 'valid-1', position: { x: 100, y: 100 }}
          ],
          failedUpdates: [
            { nodeId: 'invalid-1', position: { x: -50, y: -50 }, error: 'Negative coordinates not allowed' },
            { nodeId: 'invalid-2', position: { x: 5000, y: 5000 }, error: 'Position exceeds canvas boundaries' }
          ]
        }
      })

      const mixedPositions = [
        { nodeId: 'valid-1', position: { x: 100, y: 100 }},    // Valid
        { nodeId: 'invalid-1', position: { x: -50, y: -50 }},   // Negative coords
        { nodeId: 'invalid-2', position: { x: 5000, y: 5000 }}  // Out of bounds
      ]

      // ACT: Execute mixed valid/invalid position updates
      const result = await batchUpdateNodePositionsAction('test-model-123', mixedPositions)

      // ASSERT: Detailed rollback information for optimistic recovery
      expect(result).toEqual({
        success: true,
        partialFailure: true,
        updatedNodes: [
          { nodeId: 'valid-1', position: { x: 100, y: 100 }}
        ],
        failedNodes: [
          { 
            nodeId: 'invalid-1', 
            attemptedPosition: { x: -50, y: -50 },
            error: 'Negative coordinates not allowed',
            rollbackRequired: true
          },
          { 
            nodeId: 'invalid-2',
            attemptedPosition: { x: 5000, y: 5000 },
            error: 'Position exceeds canvas boundaries', 
            rollbackRequired: true
          }
        ],
        batchSize: 3,
        successfulCount: 1,
        failedCount: 2,
        rollbackInstructions: [
          { nodeId: 'invalid-1', rollbackToOriginalPosition: true },
          { nodeId: 'invalid-2', rollbackToOriginalPosition: true }
        ]
      })
    })
  })

  describe('Transaction Integrity and Performance', () => {
    it('should maintain transaction boundaries across different batch operation types', async () => {
      // ARRANGE: Multiple batch operations in sequence requiring consistency
      const batchOperations = {
        creates: [{ type: NodeType.IO_NODE, name: 'Seq Create', position: { x: 0, y: 0 }}],
        updates: [{ nodeId: 'existing-1', updates: { name: 'Seq Update' }}],
        deletes: ['obsolete-1']
      }

      // Mock successful sequential operations
      mockManageNodesUseCase.batchCreateNodes.mockResolvedValue({
        isFailure: false,
        value: { createdNodes: [{ id: 'new-1', type: 'io', name: 'Seq Create' }]}
      })

      mockManageNodesUseCase.batchUpdateNodes.mockResolvedValue({
        isFailure: false,
        value: { updatedNodes: [{ id: 'existing-1', name: 'Seq Update' }]}
      })

      mockManageNodesUseCase.batchDeleteNodes.mockResolvedValue({
        isFailure: false,
        value: { deletedNodes: ['obsolete-1'] }
      })

      // ACT: Execute sequential batch operations
      const createResult = await batchCreateNodesAction('test-model-123', batchOperations.creates)
      const updateResult = await batchUpdateNodesAction('test-model-123', batchOperations.updates)  
      const deleteResult = await batchDeleteNodesAction('test-model-123', batchOperations.deletes)

      // ASSERT: Each operation maintains proper transaction boundaries
      expect(createResult.success).toBe(true)
      expect(updateResult.success).toBe(true)
      expect(deleteResult.success).toBe(true)

      // ASSERT: Each operation gets independent transaction ID
      expect(createResult.transactionId).toBeDefined()
      expect(updateResult.transactionId).toBeDefined()
      expect(createResult.transactionId).not.toBe(updateResult.transactionId)

      // ASSERT: Proper resource cleanup for each operation
      expect(mockScope.dispose).toHaveBeenCalledTimes(3)
    })

    it('should provide performance metrics for batch operation optimization', async () => {
      // ARRANGE: Large batch with performance tracking
      const largeBatch = Array.from({length: 50}, (_, i) => ({
        type: NodeType.IO_NODE,
        name: `Perf Node ${i}`,
        position: { x: i * 20, y: 0 }
      }))

      mockManageNodesUseCase.batchCreateNodes.mockImplementation(async (command) => {
        // Simulate processing time based on batch size
        await new Promise(resolve => setTimeout(resolve, command.nodesToCreate.length * 2))
        
        return {
          isFailure: false,
          value: {
            createdNodes: largeBatch.map((node, i) => ({ 
              id: `perf-${i}`, 
              ...node 
            })),
            performanceMetrics: {
              batchSize: command.nodesToCreate.length,
              processingTimeMs: command.nodesToCreate.length * 2,
              averageTimePerNode: 2,
              transactionOverheadMs: 10
            }
          }
        }
      })

      // ACT: Execute large batch with performance tracking
      const startTime = performance.now()
      const result = await batchCreateNodesAction('test-model-123', largeBatch)
      const totalTime = performance.now() - startTime

      // ASSERT: Performance metrics included in response
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          batchSize: 50,
          performanceMetrics: {
            batchExecutionTimeMs: expect.any(Number),
            serverProcessingTimeMs: 100, // 50 nodes * 2ms
            networkOverheadMs: expect.any(Number),
            averageTimePerNode: 2,
            efficiency: expect.any(Number) // Batch vs individual operation efficiency
          }
        })
      )

      // ASSERT: Batch efficiency demonstrates performance improvement
      const individualOperationTime = 50 * 20 // 50 operations * ~20ms each = 1000ms
      const batchOperationTime = result.performanceMetrics?.batchExecutionTimeMs || 0
      const efficiencyGain = (individualOperationTime - batchOperationTime) / individualOperationTime

      expect(efficiencyGain).toBeGreaterThan(0.7) // >70% efficiency improvement through batching
    })
  })

  describe('Clean Architecture Compliance in Batch Operations', () => {
    it('should enforce domain rules consistently across all batch items', async () => {
      // ARRANGE: Batch with mixed valid/invalid domain data
      mockManageNodesUseCase.batchCreateNodes.mockResolvedValue({
        isFailure: true,
        error: 'Domain validation failed for batch items',
        details: {
          validationErrors: [
            { index: 1, field: 'name', message: 'Node name must be unique' },
            { index: 2, field: 'position', message: 'Position cannot overlap with existing nodes' }
          ],
          domainRulesViolated: ['UNIQUE_NODE_NAMES', 'NO_POSITION_OVERLAP']
        }
      })

      const domainViolationBatch = [
        { type: NodeType.IO_NODE, name: 'Valid Node', position: { x: 0, y: 0 }},
        { type: NodeType.STAGE_NODE, name: 'Duplicate', position: { x: 50, y: 50 }}, // Duplicate name
        { type: NodeType.KB_NODE, name: 'Overlap Node', position: { x: 0, y: 0 }}    // Position overlap
      ]

      // ACT: Attempt batch creation with domain violations  
      const result = await batchCreateNodesAction('test-model-123', domainViolationBatch)

      // ASSERT: Domain rules enforced at use case boundary
      expect(result).toEqual({
        success: false,
        error: 'Domain validation failed for batch items',
        batchSize: 3,
        validationErrors: [
          { index: 1, field: 'name', message: 'Node name must be unique' },
          { index: 2, field: 'position', message: 'Position cannot overlap with existing nodes' }
        ],
        domainRulesViolated: ['UNIQUE_NODE_NAMES', 'NO_POSITION_OVERLAP'],
        architecturalBoundary: 'USE_CASE_LAYER' // Indicates where validation occurred
      })

      // ASSERT: Use case called with all batch data for consistent validation
      expect(mockManageNodesUseCase.batchCreateNodes).toHaveBeenCalledWith({
        modelId: 'test-model-123',
        userId: 'test-user',
        nodesToCreate: domainViolationBatch,
        transactionMode: 'ATOMIC'
      })

      // CLEAN ARCHITECTURE PRINCIPLE: Domain rules enforced consistently
      // across entire batch, not on individual items
    })

    it('should maintain use case workflow integrity during batch operations', async () => {
      // ARRANGE: Batch operation that affects model workflow state
      mockManageNodesUseCase.batchDeleteNodes.mockResolvedValue({
        isFailure: false,
        value: {
          deletedNodes: ['workflow-step-2'],
          workflowStateUpdated: true,
          cascadingEffects: [
            { type: 'RECONNECT_EDGES', fromNode: 'workflow-step-1', toNode: 'workflow-step-3' }
          ]
        }
      })

      const workflowBatch = ['workflow-step-2'] // Deleting middle step

      // ACT: Execute batch deletion affecting workflow
      const result = await batchDeleteNodesAction('test-model-123', workflowBatch, {
        maintainWorkflowIntegrity: true
      })

      // ASSERT: Use case maintains workflow integrity
      expect(result).toEqual({
        success: true,
        deletedNodeIds: ['workflow-step-2'],
        workflowIntegrityMaintained: true,
        cascadingEffects: [
          { type: 'RECONNECT_EDGES', fromNode: 'workflow-step-1', toNode: 'workflow-step-3' }
        ]
      })

      // ASSERT: Use case called with workflow integrity preservation
      expect(mockManageNodesUseCase.batchDeleteNodes).toHaveBeenCalledWith({
        modelId: 'test-model-123',
        userId: 'test-user',
        nodeIdsToDelete: workflowBatch,
        options: {
          validateDependencies: true,
          cascadeDelete: false,
          maintainWorkflowIntegrity: true,
          transactionMode: 'ATOMIC'
        }
      })

      // CLEAN ARCHITECTURE PRINCIPLE: Use case layer handles complex workflow logic,
      // Server Action layer remains focused on interface adaptation
    })
  })
})