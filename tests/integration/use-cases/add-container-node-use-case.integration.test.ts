import { AddContainerNodeUseCase } from '../../../lib/use-cases/function-model/add-container-node-use-case';
import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { SupabaseEventBus } from '../../../lib/infrastructure/events/supabase-event-bus';
import { createClient } from '@supabase/supabase-js';
import { ContainerNodeType, ModelStatus } from '../../../lib/domain/enums';
import { FunctionModel } from '../../../lib/domain/entities/function-model';
import { ModelName } from '../../../lib/domain/value-objects/model-name';
import { Version } from '../../../lib/domain/value-objects/version';

/**
 * PRODUCTION-READY INTEGRATION TEST - NO MOCKS
 * Tests the complete use case against real Supabase infrastructure
 */
describe('AddContainerNodeUseCase - Integration', () => {
  let useCase: AddContainerNodeUseCase;
  let repository: SupabaseFunctionModelRepository;
  let eventBus: SupabaseEventBus;
  let testModel: FunctionModel;
  let supabase: any;

  beforeAll(async () => {
    // Set TEST_MODE to prevent Jest mocking
    process.env.TEST_MODE = 'integration';
    
    // Use real Supabase client (no mocks in integration config)
    console.log('Creating REAL Supabase client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
    );
    
    // Debug Supabase client structure
    console.log('🔍 Supabase client type:', typeof supabase);
    console.log('🔍 Supabase client has from method:', typeof supabase.from);
    
    if (supabase.from) {
      const tableBuilder = supabase.from('function_models');
      console.log('🔍 Table builder type:', typeof tableBuilder);
      console.log('🔍 Table builder has insert:', typeof tableBuilder.insert);
      console.log('🔍 Table builder has upsert:', typeof tableBuilder.upsert);
      console.log('🔍 Table builder has select:', typeof tableBuilder.select);
      if (typeof tableBuilder.insert !== 'function') {
        throw new Error('CRITICAL: Real Supabase client not loaded - insert method missing');
      }
      console.log('✅ Real Supabase client verified with working CRUD methods');
    }

    repository = new SupabaseFunctionModelRepository(supabase);
    eventBus = new SupabaseEventBus(supabase);
    useCase = new AddContainerNodeUseCase(repository, eventBus);
  });

  beforeEach(async () => {
    // Create a real test model
    const modelNameResult = ModelName.create('Integration Test Model');
    const versionResult = Version.create('1.0.0');
    
    expect(modelNameResult.isSuccess).toBe(true);
    expect(versionResult.isSuccess).toBe(true);

    const modelResult = FunctionModel.create({
      modelId: crypto.randomUUID(),
      name: modelNameResult.value!,
      description: 'Real integration test model',
      version: versionResult.value!,
      status: ModelStatus.DRAFT,
      currentVersion: versionResult.value!,
      versionCount: 1,
      metadata: { createdBy: 'integration-test' },
      permissions: { owner: 'integration-test' },
      aiAgentConfig: undefined
    });

    if (modelResult.isFailure) {
      console.error('Model creation failed:', modelResult.error);
    }
    expect(modelResult.isSuccess).toBe(true);
    testModel = modelResult.value!;

    // Save to real database  
    const saveResult = await repository.save(testModel);
    if (saveResult.isFailure) {
      console.error('SAVE ERROR DETAILS:', saveResult.error);
      console.error('Full error object:', JSON.stringify(saveResult.error, null, 2));
      throw new Error(`Failed to save test model: ${saveResult.error}`);
    }
    expect(saveResult.isSuccess).toBe(true);
    
    // Verify the model was actually saved
    const verifyResult = await repository.findById(testModel.modelId);
    if (verifyResult.isFailure) {
      console.error('Failed to verify saved model:', verifyResult.error);
    }
    expect(verifyResult.isSuccess).toBe(true);
    expect(verifyResult.value).not.toBeNull();
  });

  afterEach(async () => {
    // Clean up real database
    if (testModel) {
      await repository.delete(testModel.modelId);
    }
  });

  describe('Real Business Scenarios', () => {
    it('should add IO node to actual model and persist to database', async () => {
      // Arrange - Real command data
      const command = {
        modelId: testModel.modelId,
        name: 'Input Processing Node',
        nodeType: ContainerNodeType.IO_NODE,
        position: { x: 100, y: 200 },
        description: 'Handles input processing',
        userId: 'integration-test'
      };

      // Act - Execute real use case
      const result = await useCase.execute(command);

      // Assert - Real verification
      if (result.isFailure) {
        throw new Error(`Use case execution failed: ${result.error}`);
      }
      expect(result.isSuccess).toBe(true);
      expect(result.value.nodeId).toBeDefined();
      expect(result.value.name).toBe(command.name);
      expect(result.value.nodeType).toBe(ContainerNodeType.IO_NODE);

      // Verify actual database persistence
      const retrievedModel = await repository.findById(testModel.modelId);
      expect(retrievedModel.isSuccess).toBe(true);
      expect(retrievedModel.value!.nodes.size).toBe(1);
    });

    it('should add Stage node and handle real business rules', async () => {
      // Arrange
      const command = {
        modelId: testModel.modelId,
        name: 'Processing Stage',
        nodeType: ContainerNodeType.STAGE_NODE,
        position: { x: 300, y: 400 },
        userId: 'integration-test'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert real behavior
      expect(result.isSuccess).toBe(true);
      expect(result.value.nodeType).toBe(ContainerNodeType.STAGE_NODE);

      // Verify in real database
      const updatedModel = await repository.findById(testModel.modelId);
      expect(updatedModel.value!.nodes.size).toBe(1);
    });

    it('should fail when model does not exist in database', async () => {
      // Arrange - Non-existent model
      const command = {
        modelId: 'non-existent-model-id',
        name: 'Test Node',
        nodeType: ContainerNodeType.IO_NODE,
        position: { x: 0, y: 0 },
        userId: 'integration-test'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert real failure
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Function model not found');
    });

    it('should validate business rules against real domain entities', async () => {
      // Arrange - Invalid command
      const command = {
        modelId: testModel.modelId,
        name: '', // Invalid empty name
        nodeType: ContainerNodeType.IO_NODE,
        position: { x: 0, y: 0 },
        userId: 'integration-test'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert real validation
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('required');
    });
  });
});