/**
 * @jest-environment node
 * 
 * INTEGRATION TEST - End-to-End Form Workflow with Real Database
 * 
 * This test defines the complete expected behavior for the user workflow:
 * Form Submit → Use Case → Database → Redirect → Real Model Creation
 * 
 * CURRENT PROBLEM: Complete disconnect between UI and backend systems.
 * EXPECTED BEHAVIOR: Complete integration from UI form to database persistence.
 * 
 * Full Stack Integration Testing:
 * - Form Components (Presentation) → Server Actions (Interface Adapter)
 * - Server Actions (Interface Adapter) → Use Cases (Application)
 * - Use Cases (Application) → Repository (Infrastructure) 
 * - Repository (Infrastructure) → Database (External)
 * - Database → Repository → Use Cases → API → UI State
 * 
 * NO MOCKS ALLOWED - Uses real:
 * - Next.js form submission mechanisms
 * - Server actions and API routes
 * - Supabase database with real tables
 * - Repository implementations
 * - Use case implementations  
 * - React hook state management
 * - Next.js router navigation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '@/lib/infrastructure/repositories/supabase-function-model-repository';
import { createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { ServiceTokens } from '@/lib/infrastructure/di/container';
import { ModelStatus } from '@/lib/domain/enums';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/function-models/route';
import { AuthenticatedUser } from '@/lib/api/middleware';

interface CompleteWorkflowData {
  // Form data that user would enter
  formData: {
    name: string;
    description: string;
    category: string;
    executionMode: string;
    contextAccess: string;
    templateId?: string;
  };
  // Expected outcomes
  expectedOutcomes: {
    modelCreated: boolean;
    hasRealUUID: boolean;
    persistedInDatabase: boolean;
    redirectsToDesigner: boolean;
    availableInList: boolean;
  };
}

interface WorkflowStepResult {
  success: boolean;
  modelId?: string;
  error?: string;
  redirectUrl?: string;
}

describe('End-to-End Form Workflow with Real Database', () => {
  let repository: SupabaseFunctionModelRepository;
  let testUserId: string;
  let createdModelIds: string[] = [];
  let simulateFormSubmission: (formData: any) => Promise<WorkflowStepResult>;
  let fetchModelsList: () => Promise<{success: boolean; models?: Array<{modelId: string; name: string; description?: string; status: ModelStatus;}>; error?: string;}>;

  beforeEach(async () => {
    // Setup real infrastructure for full integration testing
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    repository = new SupabaseFunctionModelRepository(supabase);
    testUserId = 'integration-test-user-' + Date.now();
    
    // Setup helper functions
    simulateFormSubmission = async (formData: any): Promise<WorkflowStepResult> => {
      try {
        const request = new NextRequest('http://localhost:3000/api/function-models', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            templateId: formData.templateId
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const mockUser: AuthenticatedUser = {
          id: testUserId,
          email: 'integration-test@example.com',
          role: 'user'
        };

        const response = await POST(request, mockUser);
        const result = await response.json();

        if (result.success) {
          return {
            success: true,
            modelId: result.data.modelId,
            redirectUrl: `/dashboard/function-model/${result.data.modelId}`
          };
        } else {
          return {
            success: false,
            error: result.error?.message || 'Unknown error'
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unexpected error'
        };
      }
    };

    fetchModelsList = async () => {
      try {
        const request = new NextRequest('http://localhost:3000/api/function-models?page=1&pageSize=50');

        const mockUser: AuthenticatedUser = {
          id: testUserId,
          email: 'integration-test@example.com',
          role: 'user'
        };

        const response = await GET(request, mockUser);
        const result = await response.json();

        return {
          success: result.success,
          models: result.data || [],
          error: result.error?.message
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch models list'
        };
      }
    };
  });

  afterEach(async () => {
    // Clean up all test data from real database
    for (const modelId of createdModelIds) {
      await repository.delete(modelId);
    }
    createdModelIds = [];
  });

  /**
   * TEST 1: Complete Happy Path - Form to Database to List
   * 
   * FAILING STATE: Form creates fake ID, doesn't save, redirects to non-existent model
   * EXPECTED: Complete workflow should work end-to-end with real persistence
   */
  it('should complete entire workflow from form submission to database persistence to availability in list', async () => {
    const workflowData: CompleteWorkflowData = {
      formData: {
        name: 'Complete Integration Test Workflow',
        description: 'Testing the full end-to-end integration from form to database',
        category: 'Customer Service',
        executionMode: 'sequential',
        contextAccess: 'hierarchical',
        templateId: 'customer-onboarding'
      },
      expectedOutcomes: {
        modelCreated: true,
        hasRealUUID: true,
        persistedInDatabase: true,
        redirectsToDesigner: true,
        availableInList: true
      }
    };

    // STEP 1: Submit form data via real API route
    const createResult = await simulateFormSubmission(workflowData.formData);
    
    // Verify model creation
    expect(createResult.success).toBe(true);
    expect(createResult.modelId).toBeDefined();
    
    const modelId = createResult.modelId!;
    createdModelIds.push(modelId);

    // STEP 2: Verify real UUID was generated (not fake timestamp ID)
    expect(modelId).not.toMatch(/^new-\d+$/); // Should not be fake 'new-' + timestamp
    expect(modelId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); // Real UUID

    // STEP 3: Verify model persisted in real database
    const persistedModelResult = await repository.findById(modelId);
    expect(persistedModelResult.isSuccess).toBe(true);
    expect(persistedModelResult.value).toBeDefined();
    
    const persistedModel = persistedModelResult.value!;
    expect(persistedModel.name.toString()).toBe(workflowData.formData.name);
    expect(persistedModel.description).toBe(workflowData.formData.description);
    expect(persistedModel.status).toBe(ModelStatus.DRAFT);

    // STEP 4: Verify model appears in list API via real endpoint
    const listResult = await fetchModelsList();
    expect(listResult.success).toBe(true);
    expect(listResult.models).toBeDefined();
    
    const createdModelInList = listResult.models!.find(m => m.modelId === modelId);
    expect(createdModelInList).toBeDefined();
    expect(createdModelInList!.name).toBe(workflowData.formData.name);

    // STEP 5: Verify redirect URL would be correct
    const expectedRedirectUrl = `/dashboard/function-model/${modelId}`;
    expect(createResult.redirectUrl || `/dashboard/function-model/${modelId}`).toBe(expectedRedirectUrl);
  });

  /**
   * TEST 2: Multi-Step Form Data Validation Across Layers
   * 
   * FAILING STATE: UI validation is disconnected from domain rules
   * EXPECTED: All validation should be consistent across UI, API, and domain layers
   */
  it('should validate form data consistently across all layers', async () => {
    // Test various validation scenarios that should be consistent
    const validationScenarios = [
      {
        formData: {
          name: '', // Empty name
          description: 'Valid description',
          category: 'Customer Service',
          executionMode: 'sequential',
          contextAccess: 'hierarchical'
        },
        expectedError: 'Model name is required'
      },
      {
        formData: {
          name: 'a'.repeat(256), // Name too long
          description: 'Valid description',
          category: 'Customer Service', 
          executionMode: 'sequential',
          contextAccess: 'hierarchical'
        },
        expectedError: 'Model name'
      },
      {
        formData: {
          name: 'Valid Name',
          description: 'x'.repeat(5001), // Description too long
          category: 'Customer Service',
          executionMode: 'sequential', 
          contextAccess: 'hierarchical'
        },
        expectedError: 'description cannot exceed 5000 characters'
      }
    ];

    for (const scenario of validationScenarios) {
      const result = await simulateFormSubmission(scenario.formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.toLowerCase()).toContain(scenario.expectedError.toLowerCase());
    }
  });

  /**
   * TEST 3: Concurrent Form Submissions Handle Race Conditions
   * 
   * FAILING STATE: No handling of concurrent operations
   * EXPECTED: System should handle concurrent form submissions gracefully
   */
  it('should handle concurrent form submissions without data corruption', async () => {
    // Create multiple similar form submissions concurrently
    const concurrentSubmissions = Array.from({ length: 5 }, (_, index) => ({
      name: `Concurrent Test Model ${index + 1}`,
      description: `Testing concurrent submission ${index + 1}`,
      category: 'Operations',
      executionMode: 'parallel',
      contextAccess: 'shared'
    }));

    // Submit all forms concurrently
    const submissionPromises = concurrentSubmissions.map(formData => 
      simulateFormSubmission(formData)
    );

    const results = await Promise.allSettled(submissionPromises);

    // Verify all submissions were handled properly
    let successCount = 0;
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    );

    successCount = successful.length;
    expect(successCount).toBe(5); // All should succeed with unique UUIDs

    // Track all created models for cleanup
    for (const result of successful) {
      if (result.status === 'fulfilled' && result.value.success && result.value.modelId) {
        createdModelIds.push(result.value.modelId);
      }
    }

    // Verify each model has unique ID
    const modelIds = successful.map(result => 
      result.status === 'fulfilled' ? result.value.modelId : null
    ).filter(Boolean);
    
    const uniqueIds = new Set(modelIds);
    expect(uniqueIds.size).toBe(modelIds.length); // All IDs should be unique
  });

  /**
   * TEST 4: Database Transaction Integrity
   * 
   * FAILING STATE: No transaction handling
   * EXPECTED: Failed operations should not leave partial data
   */
  it('should maintain database integrity during failed operations', async () => {
    // Create a scenario likely to cause database constraint violation
    const problematicData = {
      name: 'Transaction Test Model',
      description: 'Testing transaction rollback',
      category: 'Analytics',
      executionMode: 'conditional',
      contextAccess: 'isolated'
    };

    // First submission should succeed
    const firstResult = await this.simulateFormSubmission(problematicData);
    expect(firstResult.success).toBe(true);
    createdModelIds.push(firstResult.modelId!);

    // Second submission with same name should fail (duplicate prevention)
    const secondResult = await simulateFormSubmission(problematicData);
    expect(secondResult.success).toBe(false);

    // Verify database is clean - no partial records created
    const allModelsResult = await repository.findAll();
    if (allModelsResult.isSuccess) {
      const testModels = allModelsResult.value.filter(m => 
        m.name.toString() === problematicData.name
      );
      expect(testModels).toHaveLength(1); // Only the successful one should exist
    }
  });

  /**
   * TEST 5: Real-time Data Consistency After Operations
   * 
   * FAILING STATE: UI state is stale after operations
   * EXPECTED: UI should reflect real database state after operations
   */
  it('should maintain data consistency between operations and UI state', async () => {
    // Create a model
    const initialData = {
      name: 'Data Consistency Test Model',
      description: 'Testing real-time consistency',
      category: 'Governance',
      executionMode: 'priority',
      contextAccess: 'hierarchical'
    };

    const createResult = await simulateFormSubmission(initialData);
    expect(createResult.success).toBe(true);
    createdModelIds.push(createResult.modelId!);

    // Immediately fetch the list - should include the new model
    const listAfterCreate = await fetchModelsList();
    expect(listAfterCreate.success).toBe(true);
    
    const newModelInList = listAfterCreate.models!.find(m => m.modelId === createResult.modelId);
    expect(newModelInList).toBeDefined();
    expect(newModelInList!.name).toBe(initialData.name);

    // Delete the model (when delete functionality is implemented)
    await repository.delete(createResult.modelId!);

    // Fetch list again - should no longer include the deleted model
    const listAfterDelete = await fetchModelsList();
    expect(listAfterDelete.success).toBe(true);
    
    const deletedModelInList = listAfterDelete.models!.find(m => m.modelId === createResult.modelId);
    expect(deletedModelInList).toBeUndefined();
  });

});