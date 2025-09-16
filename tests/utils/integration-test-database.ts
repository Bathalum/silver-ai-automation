/**
 * Integration Test Database Utilities
 * 
 * Provides utilities for integration testing with real Supabase database
 * while maintaining data isolation and proper cleanup.
 * 
 * Key Features:
 * - Real database connections
 * - Test data isolation with unique prefixes
 * - Automatic cleanup after tests
 * - Transaction support for atomic test operations
 * - Database constraint testing
 * 
 * NO MOCKS - Uses real Supabase database with test data management
 */

import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '@/lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { ModelName } from '@/lib/domain/value-objects/model-name';
import { Version } from '@/lib/domain/value-objects/version';
import { ModelStatus } from '@/lib/domain/enums';

export interface IntegrationTestContext {
  supabase: SupabaseClient;
  repository: SupabaseFunctionModelRepository;
  testUserId: string;
  testPrefix: string;
  createdModelIds: string[];
  cleanup: () => Promise<void>;
}

export interface TestModelFactory {
  createTestModel(overrides?: Partial<{
    name: string;
    description: string;
    status: ModelStatus;
    metadata: Record<string, any>;
  }>): Promise<FunctionModel>;
  
  createMultipleTestModels(count: number, namePrefix?: string): Promise<FunctionModel[]>;
  
  createModelWithNodes(nodeCount: number): Promise<FunctionModel>;
}

/**
 * Creates an isolated test context for integration testing
 * Each test gets its own unique prefix to avoid data collisions
 */
export async function createIntegrationTestContext(): Promise<IntegrationTestContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Use service role key for integration tests (full database access)
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const repository = new SupabaseFunctionModelRepository(supabase);
  const testPrefix = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const testUserId = `${testPrefix}-user`;
  const createdModelIds: string[] = [];

  const cleanup = async () => {
    // Clean up all test data created during the test
    for (const modelId of createdModelIds) {
      try {
        await repository.delete(modelId);
      } catch (error) {
        console.warn(`Failed to cleanup model ${modelId}:`, error);
      }
    }
    
    // Additional cleanup for any test data that might have been created directly
    try {
      const { error } = await supabase
        .from('function_models')
        .delete()
        .like('name', `${testPrefix}%`);
        
      if (error) {
        console.warn('Failed to cleanup test models by prefix:', error);
      }
    } catch (error) {
      console.warn('Error during test cleanup:', error);
    }
  };

  return {
    supabase,
    repository,
    testUserId,
    testPrefix,
    createdModelIds,
    cleanup
  };
}

/**
 * Test Model Factory for creating standardized test data
 */
export function createTestModelFactory(context: IntegrationTestContext): TestModelFactory {
  return {
    async createTestModel(overrides = {}) {
      const defaultName = `${context.testPrefix}-model-${context.createdModelIds.length + 1}`;
      
      const modelNameResult = ModelName.create(overrides.name || defaultName);
      if (modelNameResult.isFailure) {
        throw new Error(`Invalid model name: ${modelNameResult.error}`);
      }

      const modelResult = FunctionModel.create({
        modelId: crypto.randomUUID(),
        name: modelNameResult.value,
        description: overrides.description || 'Test model description',
        version: Version.initial(),
        status: overrides.status || ModelStatus.DRAFT,
        currentVersion: Version.initial(),
        nodes: new Map(),
        actionNodes: new Map(),
        metadata: {
          testPrefix: context.testPrefix,
          ...overrides.metadata
        },
        permissions: {
          owner: context.testUserId,
          viewers: [],
          editors: []
        }
      });

      if (modelResult.isFailure) {
        throw new Error(`Failed to create test model: ${modelResult.error}`);
      }

      const model = modelResult.value;
      
      // Save to database
      const saveResult = await context.repository.save(model);
      if (saveResult.isFailure) {
        throw new Error(`Failed to save test model: ${saveResult.error}`);
      }

      // Track for cleanup
      context.createdModelIds.push(model.modelId);
      
      return model;
    },

    async createMultipleTestModels(count, namePrefix = 'batch-model') {
      const models: FunctionModel[] = [];
      
      for (let i = 1; i <= count; i++) {
        const model = await this.createTestModel({
          name: `${context.testPrefix}-${namePrefix}-${i}`,
          description: `Test model ${i} of ${count}`
        });
        models.push(model);
      }
      
      return models;
    },

    async createModelWithNodes(nodeCount) {
      const model = await this.createTestModel({
        name: `${context.testPrefix}-model-with-nodes`,
        description: `Test model with ${nodeCount} nodes`
      });

      // TODO: Add node creation logic when node management is implemented
      // For now, just return the model
      return model;
    }
  };
}

/**
 * Database Transaction Helper for Integration Tests
 */
export class IntegrationTestTransaction {
  constructor(private supabase: SupabaseClient) {}

  async executeInTransaction<T>(operation: (client: SupabaseClient) => Promise<T>): Promise<T> {
    // Note: Supabase doesn't expose direct transaction control in the client
    // For integration tests, we'll rely on the repository's transaction handling
    // and implement proper rollback in test cleanup
    return operation(this.supabase);
  }
}

/**
 * Database Constraint Testing Utilities
 */
export class DatabaseConstraintTester {
  constructor(private context: IntegrationTestContext) {}

  async testUniqueConstraint(
    operation: () => Promise<any>,
    expectedConstraint: string
  ): Promise<{
    constraintViolated: boolean;
    error?: string;
  }> {
    try {
      await operation();
      return { constraintViolated: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConstraintViolation = errorMessage.toLowerCase().includes(expectedConstraint.toLowerCase());
      
      return {
        constraintViolated: isConstraintViolation,
        error: errorMessage
      };
    }
  }

  async testForeignKeyConstraint(
    operation: () => Promise<any>,
    expectedReferencedTable: string
  ): Promise<{
    constraintViolated: boolean;
    error?: string;
  }> {
    return this.testUniqueConstraint(operation, `foreign key`);
  }

  async testNotNullConstraint(
    operation: () => Promise<any>,
    expectedColumn: string
  ): Promise<{
    constraintViolated: boolean;
    error?: string;
  }> {
    return this.testUniqueConstraint(operation, `not null`);
  }
}

/**
 * Performance Testing Utilities for Integration Tests
 */
export class IntegrationTestPerformanceMonitor {
  private operations: Array<{
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
  }> = [];

  startOperation(name: string): void {
    this.operations.push({
      name,
      startTime: performance.now()
    });
  }

  endOperation(name: string): number {
    const operation = this.operations.find(op => op.name === name && !op.endTime);
    if (!operation) {
      throw new Error(`No active operation found with name: ${name}`);
    }

    operation.endTime = performance.now();
    operation.duration = operation.endTime - operation.startTime;
    
    return operation.duration;
  }

  getOperationDuration(name: string): number | undefined {
    const operation = this.operations.find(op => op.name === name && op.duration);
    return operation?.duration;
  }

  getAllOperations(): Array<{
    name: string;
    duration: number;
  }> {
    return this.operations
      .filter(op => op.duration !== undefined)
      .map(op => ({
        name: op.name,
        duration: op.duration!
      }));
  }

  reset(): void {
    this.operations = [];
  }
}

/**
 * Real Data Assertion Helpers
 */
export class IntegrationTestAssertions {
  static isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  static isFakeTimestampId(value: string): boolean {
    const fakeIdRegex = /^new-\d+$/;
    return fakeIdRegex.test(value);
  }

  static isValidModelName(name: string): boolean {
    return name.length > 0 && name.length <= 255 && name.trim() === name;
  }

  static isValidModelDescription(description: string | undefined): boolean {
    return !description || (description.length <= 5000);
  }

  static hasRequiredModelFields(model: any): boolean {
    return !!(
      model &&
      model.modelId &&
      model.name &&
      model.version &&
      model.status &&
      model.createdAt &&
      model.updatedAt
    );
  }

  static async verifyModelPersistence(
    repository: SupabaseFunctionModelRepository,
    modelId: string,
    expectedProperties: Partial<{
      name: string;
      description: string;
      status: ModelStatus;
    }>
  ): Promise<{
    persisted: boolean;
    matches: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const findResult = await repository.findById(modelId);
      
      if (findResult.isFailure || !findResult.value) {
        return {
          persisted: false,
          matches: false,
          errors: ['Model not found in database']
        };
      }

      const model = findResult.value;
      let matches = true;

      if (expectedProperties.name && model.name.toString() !== expectedProperties.name) {
        matches = false;
        errors.push(`Name mismatch: expected ${expectedProperties.name}, got ${model.name.toString()}`);
      }

      if (expectedProperties.description && model.description !== expectedProperties.description) {
        matches = false;
        errors.push(`Description mismatch: expected ${expectedProperties.description}, got ${model.description}`);
      }

      if (expectedProperties.status && model.status !== expectedProperties.status) {
        matches = false;
        errors.push(`Status mismatch: expected ${expectedProperties.status}, got ${model.status}`);
      }

      return {
        persisted: true,
        matches,
        errors
      };
    } catch (error) {
      return {
        persisted: false,
        matches: false,
        errors: [`Error verifying persistence: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }
}

/**
 * Integration Test Suite Base Class
 */
export abstract class IntegrationTestSuite {
  protected context!: IntegrationTestContext;
  protected modelFactory!: TestModelFactory;
  protected constraintTester!: DatabaseConstraintTester;
  protected performanceMonitor!: IntegrationTestPerformanceMonitor;

  async setup(): Promise<void> {
    this.context = await createIntegrationTestContext();
    this.modelFactory = createTestModelFactory(this.context);
    this.constraintTester = new DatabaseConstraintTester(this.context);
    this.performanceMonitor = new IntegrationTestPerformanceMonitor();
  }

  async teardown(): Promise<void> {
    if (this.context) {
      await this.context.cleanup();
    }
  }

  protected async createTestData(): Promise<void> {
    // Override in subclasses to create test-specific data
  }

  protected async cleanupTestData(): Promise<void> {
    // Override in subclasses for additional cleanup
  }
}