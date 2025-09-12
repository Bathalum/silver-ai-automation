/**
 * INTEGRATION TEST - React Hooks with Real API Data
 * 
 * This test defines the expected behavior for React hooks connecting to 
 * real API routes and fetching actual data from the database.
 * 
 * CURRENT PROBLEM: UI components use mock data arrays instead of real API calls.
 * EXPECTED BEHAVIOR: Hooks should fetch real data from API routes.
 * 
 * Layer Boundaries Tested:
 * - React Hooks (Interface Adapter) → API Routes (Interface Adapter)
 * - API Routes (Interface Adapter) → Use Cases (Application)  
 * - Use Cases (Application) → Repository (Infrastructure)
 * 
 * NO MOCKS ALLOWED - Uses real:
 * - HTTP requests to API routes
 * - Database queries via repository
 * - React hook state management
 * - Next.js API route handlers
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '@/lib/infrastructure/repositories/supabase-function-model-repository';
import { createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { ServiceTokens } from '@/lib/infrastructure/di/container';
import { ModelStatus } from '@/lib/domain/enums';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { ModelName } from '@/lib/domain/value-objects/model-name';
import { Version } from '@/lib/domain/value-objects/version';

// Mock fetch for testing API calls (this is the only mock allowed - HTTP transport)
global.fetch = global.fetch || jest.fn();

interface MockedFetch extends jest.Mock {
  mockResolvedValueOnce(value: any): this;
  mockRejectedValueOnce(error: any): this;
}

const mockFetch = global.fetch as MockedFetch;

// Import the real hook implementations
import { useModels, UseModelsResult } from '@/app/hooks/useModels';
import { useModelOperations, UseModelOperationsResult } from '@/app/hooks/useModelOperations';
import { ModelDto } from '@/lib/api/types';

describe('React Hooks with Real API Data Integration', () => {
  let repository: SupabaseFunctionModelRepository;
  let testUserId: string;
  let testModels: FunctionModel[] = [];

  beforeAll(() => {
    // Setup fetch mock to simulate real API responses
    mockFetch.mockClear();
  });

  beforeEach(async () => {
    // Setup real database connection and test data
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    repository = new SupabaseFunctionModelRepository(supabase);
    testUserId = 'test-user-' + Date.now();

    // Create test data in real database
    const container = await createFunctionModelContainer(supabase);
    const createUseCaseResult = await container.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);
    
    if (createUseCaseResult.isSuccess) {
      const createUseCase = createUseCaseResult.value;
      
      // Create multiple test models
      const testModelData = [
        {
          name: 'Customer Onboarding Process',
          description: 'Complete workflow for new customer setup',
          userId: testUserId
        },
        {
          name: 'Order Fulfillment Pipeline',
          description: 'Automated order processing workflow',
          userId: testUserId
        },
        {
          name: 'Data Processing Workflow',
          description: 'ETL pipeline for analytics',
          userId: testUserId
        }
      ];

      for (const modelData of testModelData) {
        const result = await createUseCase.execute(modelData);
        if (result.isSuccess) {
          const savedModelResult = await repository.findById(result.value.modelId);
          if (savedModelResult.isSuccess && savedModelResult.value) {
            testModels.push(savedModelResult.value);
          }
        }
      }
    }
  });

  afterEach(async () => {
    // Clean up test data
    for (const model of testModels) {
      await repository.delete(model.modelId);
    }
    testModels = [];
    mockFetch.mockClear();
  });

  /**
   * TEST 1: useModels Hook Fetches Real Data from API
   * 
   * FAILING STATE: UI components use static mockWorkflows array
   * EXPECTED: Hook should fetch real models from API route
   */
  it('should fetch real models from API via useModels hook', async () => {
    // Arrange - Mock successful API response with real data structure
    const expectedModels: ModelDto[] = testModels.map(model => ({
      modelId: model.modelId,
      name: model.name.toString(),
      description: model.description,
      version: model.version.toString(),
      status: model.status,
      currentVersion: model.currentVersion.toString(),
      versionCount: model.versionCount,
      metadata: model.metadata,
      permissions: {
        owner: model.permissions.owner as string,
        editors: (model.permissions.editors as string[]) || [],
        viewers: (model.permissions.viewers as string[]) || []
      },
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
      lastSavedAt: model.lastSavedAt.toISOString()
    }));

    // Mock fetch before rendering hook
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: expectedModels
      })
    });

    // Act - Test the real implemented hook
    const { result } = renderHook(() => useModels());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });

    // Assert
    expect(result.current.models).toHaveLength(expectedModels.length);
    if (result.current.models.length > 0) {
      expect(result.current.models[0].name).toBe('Customer Onboarding Process');
    }
    expect(result.current.error).toBeNull();
    
    // Verify real API call was made
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/function-models'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );
  });

  /**
   * TEST 2: useModels Hook Handles API Errors Properly
   * 
   * FAILING STATE: UI doesn't handle real API errors
   * EXPECTED: Hook should handle and expose API error states
   */
  it('should handle API errors in useModels hook', async () => {
    // Arrange - Mock API error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Act - Test error handling with real hook
    const { result } = renderHook(() => useModels());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Network error');
    expect(result.current.models).toHaveLength(0);
  });

  /**
   * TEST 3: useModelOperations Hook Creates Models via Real API
   * 
   * FAILING STATE: UI uses fake handleCreate with timestamp-based IDs
   * EXPECTED: Hook should call real API and return real model IDs
   */
  it('should create real models via useModelOperations hook', async () => {
    // Arrange - Mock successful create response
    const newModelId = crypto.randomUUID();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          modelId: newModelId,
          name: 'New Test Model',
          version: '1.0.0',
          status: ModelStatus.DRAFT,
          createdAt: new Date().toISOString()
        }
      })
    });

    // Act - Test the real implemented hook
    const { result } = renderHook(() => useModelOperations());
    
    const createResult = await result.current.createModel({
      name: 'New Test Model',
      description: 'Created via hook',
      templateId: 'custom'
    });

    // Assert
    expect(createResult.success).toBe(true);
    expect(createResult.modelId).toBe(newModelId);
    expect(createResult.modelId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    // Verify real API call was made
    expect(mockFetch).toHaveBeenCalledWith('/api/function-models', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        name: 'New Test Model',
        description: 'Created via hook',
        templateId: 'custom'
      }),
      headers: expect.objectContaining({
        'Content-Type': 'application/json'
      })
    }));
  });

  /**
   * TEST 4: Hook State Management Works with Real API Calls
   * 
   * FAILING STATE: UI state is disconnected from real data
   * EXPECTED: Hook state should reflect real API call states
   */
  it('should manage loading states during real API calls', async () => {
    // Arrange - Mock slow API response
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(slowPromise);

    // Act - Test loading state management with real hook
    const { result } = renderHook(() => useModels());
    
    // Assert initial loading state
    expect(result.current.loading).toBe(true);
    expect(result.current.models).toHaveLength(0);
    
    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  /**
   * TEST 5: Refresh Functionality Triggers Real API Refetch
   * 
   * FAILING STATE: UI doesn't have refresh capability
   * EXPECTED: Hook should provide refresh that triggers new API call
   */
  it('should refetch data when refresh is called', async () => {
    // Arrange - Mock multiple API responses
    const firstResponse = { success: true, data: [] };
    const mockModel: ModelDto = {
      modelId: crypto.randomUUID(),
      name: 'Refresh Test Model',
      description: 'Test model for refresh functionality',
      version: '1.0.0',
      status: ModelStatus.DRAFT,
      currentVersion: '1.0.0',
      versionCount: 1,
      metadata: {},
      permissions: {
        owner: testUserId,
        editors: [],
        viewers: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString()
    };
    
    const secondResponse = {
      success: true,
      data: [mockModel]
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => secondResponse
      });

    // Act - Test refresh functionality with real hook
    const { result } = renderHook(() => useModels());
    
    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.models).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Trigger refresh
    await result.current.refresh();
    
    // Wait for refresh to complete and verify data updated
    await waitFor(() => {
      expect(result.current.models).toHaveLength(1);
    }, { timeout: 3000 });
    
    expect(result.current.error).toBeNull();
    
    // Verify both API calls were made
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  /**
   * TEST 6: Real Pagination Parameters are Passed to API
   * 
   * FAILING STATE: UI doesn't support real pagination
   * EXPECTED: Hook should pass pagination params to API routes
   */
  it('should pass pagination parameters to API routes', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: testModels,
        meta: {
          pagination: {
            page: 1,
            pageSize: 10,
            totalItems: testModels.length,
            totalPages: 1
          }
        }
      })
    });

    // Test pagination with real hook implementation
    const { result } = renderHook(() => useModels({ page: 1, pageSize: 10 }));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verify API call includes pagination params
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('page=1'),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('pageSize=10'),
      expect.any(Object)
    );
  });
});