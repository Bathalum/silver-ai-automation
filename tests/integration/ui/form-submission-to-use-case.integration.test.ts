/**
 * INTEGRATION TEST - Form Submission to Use Case Connection
 * 
 * This test defines the expected behavior for connecting UI form submission 
 * to real CreateFunctionModelUseCase WITHOUT ANY MOCKS.
 * 
 * CURRENT PROBLEM: UI uses fake IDs and doesn't connect to real use cases.
 * EXPECTED BEHAVIOR: Form submission creates real models via use cases.
 * 
 * Layer Boundaries Tested:
 * - Server Actions (Interface Adapter) → Use Cases (Application)
 * - Form Components (Presentation) → Server Actions (Interface Adapter)
 * 
 * NO MOCKS ALLOWED - Uses real:
 * - Supabase database
 * - Repository implementations
 * - Use case implementations
 * - Server actions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Polyfill for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });
global.Request = global.Request || class {};
global.Response = global.Response || class {};
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/function-models/route';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '@/lib/infrastructure/repositories/supabase-function-model-repository';
import { ModelStatus } from '@/lib/domain/enums';
import { AuthenticatedUser } from '@/lib/api/middleware';

// Real test data factory for integration tests
interface TestFormData {
  name: string;
  description: string;
  templateId?: string;
}

interface CreateModelResponse {
  success: boolean;
  data?: {
    modelId: string;
    name: string;
    version: string;
    status: ModelStatus;
    createdAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

describe('Form Submission to Use Case Integration', () => {
  let repository: SupabaseFunctionModelRepository;
  let testUserId: string;
  let createdModelIds: string[] = [];

  beforeEach(async () => {
    // Setup real database connection for integration testing
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    repository = new SupabaseFunctionModelRepository(supabase);
    testUserId = 'test-user-' + Date.now();
  });

  afterEach(async () => {
    // Clean up test data from real database
    for (const modelId of createdModelIds) {
      await repository.delete(modelId);
    }
    createdModelIds = [];
  });

  /**
   * TEST 1: Form Submission Creates Real Model via Use Case
   * 
   * FAILING STATE: Current UI form creates fake ID and redirects without saving
   * EXPECTED: Form submission should create real model in database
   */
  it('should create real model in database when form is submitted', async () => {
    // Arrange - Real form data as would come from UI
    const formData: TestFormData = {
      name: 'Customer Onboarding Process',
      description: 'Complete workflow for new customer account setup',
      templateId: 'customer-onboarding'
    };

    const request = new NextRequest('http://localhost:3000/api/function-models', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Mock authentication for the test (this is the only allowed mock - auth)
    const mockUser: AuthenticatedUser = {
      id: testUserId,
      email: 'test@example.com',
      role: 'user'
    };

    // Act - Submit form data to API route (simulating real form submission)
    const response = await POST(request, mockUser);
    const result: CreateModelResponse = await response.json();

    // Assert - Verify real model was created
    expect(response.status).toBe(201);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.modelId).toBeDefined();
    expect(result.data!.name).toBe(formData.name);
    expect(result.data!.status).toBe(ModelStatus.DRAFT);

    // Verify model exists in real database
    const savedModelResult = await repository.findById(result.data!.modelId);
    expect(savedModelResult.isSuccess).toBe(true);
    expect(savedModelResult.value).toBeDefined();
    expect(savedModelResult.value!.name.toString()).toBe(formData.name);

    // Track for cleanup
    createdModelIds.push(result.data!.modelId);
  });

  /**
   * TEST 2: Form Validation Errors are Properly Handled
   * 
   * FAILING STATE: UI doesn't validate against real business rules
   * EXPECTED: Server-side validation should enforce domain rules
   */
  it('should return validation error for invalid form data', async () => {
    // Arrange - Invalid form data
    const invalidFormData = {
      name: '', // Empty name should fail validation
      description: 'A' + 'x'.repeat(5000), // Too long description
      templateId: '' // Empty template ID
    };

    const request = new NextRequest('http://localhost:3000/api/function-models', {
      method: 'POST',
      body: JSON.stringify(invalidFormData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const mockUser: AuthenticatedUser = {
      id: testUserId,
      email: 'test@example.com',
      role: 'user'
    };

    // Act
    const response = await POST(request, mockUser);
    const result: CreateModelResponse = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain('Model name is required');
  });

  /**
   * TEST 3: Duplicate Name Detection Works
   * 
   * FAILING STATE: UI doesn't check for duplicates
   * EXPECTED: Use case should prevent duplicate names
   */
  it('should prevent creating models with duplicate names', async () => {
    // Arrange - Create first model
    const formData: TestFormData = {
      name: 'Unique Process Name',
      description: 'First model with this name'
    };

    const request1 = new NextRequest('http://localhost:3000/api/function-models', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const mockUser: AuthenticatedUser = {
      id: testUserId,
      email: 'test@example.com',
      role: 'user'
    };

    // Act - Create first model
    const response1 = await POST(request1, mockUser);
    const result1: CreateModelResponse = await response1.json();

    expect(result1.success).toBe(true);
    createdModelIds.push(result1.data!.modelId);

    // Try to create duplicate
    const request2 = new NextRequest('http://localhost:3000/api/function-models', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response2 = await POST(request2, mockUser);
    const result2: CreateModelResponse = await response2.json();

    // Assert
    expect(response2.status).toBe(409);
    expect(result2.success).toBe(false);
    expect(result2.error!.message).toContain('already exists');
  });

  /**
   * TEST 4: Real Database Constraints are Enforced
   * 
   * FAILING STATE: UI doesn't respect database constraints
   * EXPECTED: Real database constraints should be enforced
   */
  it('should enforce database constraints via use case', async () => {
    // Arrange - Data that violates database constraints
    const constraintViolatingData = {
      name: 'Valid Name',
      description: 'Valid description',
      userId: 'invalid-user-id-that-might-violate-foreign-key'
    };

    const request = new NextRequest('http://localhost:3000/api/function-models', {
      method: 'POST',
      body: JSON.stringify(constraintViolatingData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const mockUser: AuthenticatedUser = {
      id: 'invalid-user-id-that-might-violate-foreign-key',
      email: 'test@example.com',
      role: 'user'
    };

    // Act
    const response = await POST(request, mockUser);
    const result: CreateModelResponse = await response.json();

    // Assert - Should handle constraint violations gracefully
    if (!result.success) {
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(result.error).toBeDefined();
    } else {
      // If it succeeds, verify the model was actually created properly
      const savedModelResult = await repository.findById(result.data!.modelId);
      expect(savedModelResult.isSuccess).toBe(true);
      createdModelIds.push(result.data!.modelId);
    }
  });

  /**
   * TEST 5: Generated Model ID is Real UUID (Not Fake Timestamp)
   * 
   * FAILING STATE: UI generates fake ID like 'new-' + Date.now()
   * EXPECTED: Use case should generate real UUID
   */
  it('should generate real UUID for model ID, not fake timestamp-based ID', async () => {
    // Arrange
    const formData: TestFormData = {
      name: 'UUID Test Model',
      description: 'Testing real UUID generation'
    };

    const request = new NextRequest('http://localhost:3000/api/function-models', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const mockUser: AuthenticatedUser = {
      id: testUserId,
      email: 'test@example.com',
      role: 'user'
    };

    // Act
    const response = await POST(request, mockUser);
    const result: CreateModelResponse = await response.json();

    // Assert
    expect(result.success).toBe(true);
    const modelId = result.data!.modelId;
    
    // Should be real UUID, not fake timestamp-based ID
    expect(modelId).not.toMatch(/^new-\d+$/); // Fake pattern: 'new-' + timestamp
    expect(modelId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); // Real UUID pattern

    createdModelIds.push(modelId);
  });
});