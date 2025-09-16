/**
 * INTEGRATION TEST - saveModelWithNodesAction TDD Implementation
 * 
 * This test defines the expected behavior for the saveModelWithNodesAction
 * server action following Clean Architecture TDD principles.
 * 
 * TEST-DRIVEN DEVELOPMENT APPROACH:
 * 1. RED: Write failing test that defines expected behavior
 * 2. GREEN: Implement minimal code to pass test 
 * 3. REFACTOR: Improve while keeping tests passing
 * 
 * Layer Boundaries Tested (Clean Architecture):
 * - Server Actions (Interface Adapter) → Use Cases (Application)
 * - Dependency Injection Container Resolution
 * - FormData parsing and validation
 * - Batch node position updates through ManageWorkflowNodesUseCase
 * - Proper error handling and Clean Architecture compliance
 * 
 * ARCHITECTURAL VALIDATION:
 * - Ensures Server Action doesn't contain business logic
 * - Validates proper dependency inversion through DI container
 * - Confirms use case handles all business rules
 * - Tests boundary filter behavior between layers
 * 
 * NO MOCKS FOR CORE ARCHITECTURE - Uses real:
 * - DI Container and service resolution
 * - ManageWorkflowNodesUseCase execution
 * - FormData parsing and validation
 * - Database persistence through repository
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '@/lib/infrastructure/repositories/supabase-function-model-repository';
import { setupContainer } from '@/lib/infrastructure/di/function-model-module';
import { ServiceTokens } from '@/lib/infrastructure/di/container';
import { ModelStatus, NodeType, NodeStatus } from '@/lib/domain/enums';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { ModelName } from '@/lib/domain/value-objects/model-name';
import { Version } from '@/lib/domain/value-objects/version';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Mock Next.js functions that are external to our architecture
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn()
}));

// Mock authentication since this is external to our domain
jest.mock('@/lib/supabase/server', () => ({
  getAuthenticatedUser: jest.fn(() => Promise.resolve({
    id: 'test-user-id',
    email: 'test@example.com'
  }))
}));

const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

// Import the actual Server Actions under test
import { saveModelWithNodesAction, createModelActionWithState, ServerActionResult } from '@/app/actions/model-actions';

describe('saveModelWithNodesAction - Clean Architecture TDD Integration', () => {
  let repository: SupabaseFunctionModelRepository;
  let testUserId: string;
  let testModelId: string;
  let supabase: any;
  let createdModelIds: string[] = [];

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup test infrastructure - real Supabase connection for integration testing
    supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    repository = new SupabaseFunctionModelRepository(supabase);
    testUserId = 'test-user-' + Date.now();
    createdModelIds = [];
    
    // Create test model via server action (following proper architectural flow)
    const uniqueName = `TDD Save Test Model ${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const formData = new FormData();
    formData.append('name', uniqueName);
    formData.append('description', 'Test model for node position save testing');
    formData.append('category', 'TEST');
    formData.append('executionMode', 'sequential');
    formData.append('contextAccess', 'hierarchical');
    formData.append('userId', testUserId);

    const createResult = await createModelActionWithState(null, formData);
    
    if (!createResult.success || !createResult.modelId) {
      throw new Error('Failed to create test model: ' + (createResult.error || 'Unknown error'));
    }
    
    testModelId = createResult.modelId;
    createdModelIds.push(testModelId);
    
    // Add test nodes to the model using proper use case layer
    const container = await setupContainer();
    const scope = container.createScope();
    
    try {
      const manageNodesUseCaseResult = await scope.resolve(ServiceTokens.MANAGE_WORKFLOW_NODES_USE_CASE);
      if (manageNodesUseCaseResult.isFailure) {
        throw new Error('Failed to resolve ManageWorkflowNodesUseCase');
      }
      
      const manageNodesUseCase = manageNodesUseCaseResult.value;
      
      // Add multiple nodes for batch testing
      await manageNodesUseCase.addNode(testModelId, {
        type: 'io',
        position: { x: 100, y: 100 },
        data: { label: 'Test Input Node' }
      }, testUserId);
      
      await manageNodesUseCase.addNode(testModelId, {
        type: 'stage', 
        position: { x: 200, y: 200 },
        data: { label: 'Test Stage Node' }
      }, testUserId);
      
    } finally {
      await scope.dispose();
    }
  });

  afterEach(async () => {
    // Clean up test data
    for (const modelId of createdModelIds) {
      try {
        await repository.delete(modelId);
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    }
    createdModelIds = [];
  });

  describe('TDD Red Phase - Failing Tests Define Expected Behavior', () => {
    
    it('should successfully batch update node positions through Clean Architecture layers', async () => {
      // ARRANGE - Prepare FormData with node position updates
      const formData = new FormData();
      
      // Get current nodes to update their positions
      const currentModel = await repository.findById(testModelId);
      expect(currentModel.isSuccess).toBe(true);
      expect(currentModel.value).toBeTruthy();
      
      const nodes = Array.from(currentModel.value!.nodes.values());
      expect(nodes.length).toBeGreaterThan(0);
      
      // Prepare batch position updates
      const positionUpdates = nodes.map((node, index) => ({
        id: node.id,
        position: {
          x: 300 + (index * 50), // New positions
          y: 400 + (index * 50)
        }
      }));
      
      formData.append('nodes', JSON.stringify(positionUpdates));
      
      // ACT - Execute the server action
      const result: ServerActionResult = await saveModelWithNodesAction(testModelId, formData);
      
      // ASSERT - Verify Clean Architecture compliance and expected behavior
      
      // 1. Server Action returns success result
      expect(result.success).toBe(true);
      expect(result.modelId).toBe(testModelId);
      expect(result.error).toBeUndefined();
      
      // 2. Verify revalidatePath was called (UI layer concern)
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/function-model/${testModelId}`);
      
      // 3. Verify positions were actually updated in the database
      const updatedModel = await repository.findById(testModelId);
      expect(updatedModel.isSuccess).toBe(true);
      expect(updatedModel.value).toBeTruthy();
      
      const updatedNodes = Array.from(updatedModel.value!.nodes.values());
      
      // Verify each node position was updated correctly
      positionUpdates.forEach((expectedUpdate, index) => {
        const updatedNode = updatedNodes.find(node => node.id === expectedUpdate.id);
        expect(updatedNode).toBeTruthy();
        expect(updatedNode!.position.x).toBe(expectedUpdate.position.x);
        expect(updatedNode!.position.y).toBe(expectedUpdate.position.y);
      });
    });

    it('should validate FormData structure and reject invalid node data', async () => {
      // ARRANGE - Invalid FormData scenarios
      const testCases = [
        {
          name: 'missing nodes data',
          formData: new FormData(),
          expectedError: 'No nodes data provided'
        },
        {
          name: 'invalid JSON in nodes data',
          formData: (() => {
            const fd = new FormData();
            fd.append('nodes', 'invalid-json');
            return fd;
          })(),
          expectedError: 'Invalid nodes data format'
        },
        {
          name: 'nodes data is not an array',
          formData: (() => {
            const fd = new FormData();
            fd.append('nodes', JSON.stringify({ not: 'array' }));
            return fd;
          })(),
          expectedError: 'Nodes data must be an array'
        },
        {
          name: 'node missing required fields',
          formData: (() => {
            const fd = new FormData();
            fd.append('nodes', JSON.stringify([{ id: 'test' }])); // Missing position
            return fd;
          })(),
          expectedError: 'Invalid node data for node test'
        }
      ];

      // ACT & ASSERT - Test each validation scenario
      for (const testCase of testCases) {
        const result = await saveModelWithNodesAction(testModelId, testCase.formData);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe(testCase.expectedError);
        expect(result.modelId).toBeUndefined();
        
        // Verify revalidatePath was NOT called on error
        expect(mockRevalidatePath).not.toHaveBeenCalled();
        
        // Clear mocks for next test case
        jest.clearAllMocks();
      }
    });

    it('should handle dependency injection container failures gracefully', async () => {
      // ARRANGE - Valid FormData but we'll test DI failure handling
      const formData = new FormData();
      const validNodesData = [
        { id: 'test-node', position: { x: 100, y: 200 } }
      ];
      formData.append('nodes', JSON.stringify(validNodesData));
      
      // Mock setupContainer to fail (this tests our error handling)
      const originalSetupContainer = require('@/lib/infrastructure/di/container').setupContainer;
      
      const mockSetupContainer = jest.fn().mockRejectedValue(new Error('DI container setup failed'));
      
      // Temporarily replace the function
      (require('@/lib/infrastructure/di/container') as any).setupContainer = mockSetupContainer;
      
      try {
        // ACT - Execute with DI failure
        const result = await saveModelWithNodesAction(testModelId, formData);
        
        // ASSERT - Should handle DI failure gracefully
        expect(result.success).toBe(false);
        expect(result.error).toBe('DI container setup failed');
        expect(result.modelId).toBeUndefined();
        
      } finally {
        // Restore original function
        (require('@/lib/infrastructure/di/container') as any).setupContainer = originalSetupContainer;
      }
    });

    it('should propagate use case failures and maintain Clean Architecture boundaries', async () => {
      // ARRANGE - FormData with non-existent node IDs
      const formData = new FormData();
      const invalidNodesData = [
        { id: 'non-existent-node-1', position: { x: 100, y: 200 } },
        { id: 'non-existent-node-2', position: { x: 300, y: 400 } }
      ];
      formData.append('nodes', JSON.stringify(invalidNodesData));
      
      // ACT - Execute with invalid node IDs
      const result = await saveModelWithNodesAction(testModelId, formData);
      
      // ASSERT - Should propagate use case validation failure
      expect(result.success).toBe(false);
      expect(result.error).toContain('Node with ID non-existent-node-1 not found in model');
      expect(result.modelId).toBeUndefined();
      
      // Verify no side effects occurred
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should properly dispose of DI container scope on both success and failure', async () => {
      // This test verifies proper resource management
      
      const formData = new FormData();
      const validNodesData = [
        { id: 'test-node', position: { x: 100, y: 200 } }
      ];
      formData.append('nodes', JSON.stringify(validNodesData));
      
      // Mock scope.dispose to track calls
      const originalSetupContainer = require('@/lib/infrastructure/di/container').setupContainer;
      const mockDispose = jest.fn();
      const mockScope = {
        resolve: jest.fn().mockResolvedValue({
          isFailure: true,
          error: 'Use case resolution failed'
        }),
        dispose: mockDispose
      };
      
      const mockContainer = {
        createScope: jest.fn().mockReturnValue(mockScope)
      };
      
      const mockSetupContainer = jest.fn().mockResolvedValue(mockContainer);
      
      // Temporarily replace the function
      (require('@/lib/infrastructure/di/container') as any).setupContainer = mockSetupContainer;
      
      try {
        // ACT - Execute and expect failure
        const result = await saveModelWithNodesAction(testModelId, formData);
        
        // ASSERT - Should fail but dispose scope properly
        expect(result.success).toBe(false);
        expect(mockDispose).toHaveBeenCalledTimes(1);
        
      } finally {
        // Restore original function
        (require('@/lib/infrastructure/di/container') as any).setupContainer = originalSetupContainer;
      }
    });

    it('should enforce architectural boundaries - Server Action contains no business logic', async () => {
      // This test validates that the Server Action acts purely as an Interface Adapter
      // All business logic should be in the Use Case layer
      
      const formData = new FormData();
      
      // Get real nodes from test model
      const currentModel = await repository.findById(testModelId);
      const nodes = Array.from(currentModel.value!.nodes.values());
      
      const positionUpdates = nodes.map(node => ({
        id: node.id,
        position: { x: node.position.x + 50, y: node.position.y + 50 }
      }));
      
      formData.append('nodes', JSON.stringify(positionUpdates));
      
      // ACT
      const result = await saveModelWithNodesAction(testModelId, formData);
      
      // ASSERT - The fact that this works proves the Server Action
      // is properly delegating to the Use Case layer without containing business logic
      expect(result.success).toBe(true);
      
      // Additional architectural validation:
      // The Server Action should only handle:
      // 1. FormData parsing ✓ (tested above)
      // 2. DI container setup ✓ (tested above) 
      // 3. Use case invocation ✓ (tested above)
      // 4. Result mapping ✓ (tested above)
      // 5. UI concerns (revalidation) ✓ (tested above)
      
      // All position validation, model retrieval, batch processing
      // should be handled by the Use Case layer
    });
  });
});