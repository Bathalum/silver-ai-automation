/**
 * TDD APPLICATION LAYER TESTS - Unified Node Creation Use Case
 * 
 * These tests define the expected behavior for a unified node creation system that:
 * 1. Handles ALL 5 node types in one place
 * 2. Uses unified NodeType enum (not fragmented Container/Action types)
 * 3. Creates proper UnifiedNode domain entities
 * 4. Enforces Clean Architecture boundaries
 * 
 * ARCHITECTURAL GOAL: Unified node creation replacing fragmented approach with single, 
 * consistent entry point for ALL node creation operations.
 */

import { CreateUnifiedNodeUseCase } from '../../../lib/use-cases/function-model/create-unified-node-use-case';
import { CreateNodeCommand } from '../../../lib/use-cases/commands/node-commands';
import { NodeType, ModelStatus, NodeStatus, ExecutionMode } from '../../../lib/domain/enums/index';
import { Result } from '../../../lib/domain/shared/result';
import { IFunctionModelRepository } from '../../../lib/domain/interfaces/function-model-repository';
import { IEventBus } from '../../../lib/infrastructure/events/supabase-event-bus';
import { UnifiedNode, NodeFactory } from '../../../lib/domain/entities/unified-node';
import { FunctionModel } from '../../../lib/domain/entities/function-model';
import { NodeCreated } from '../../../lib/infrastructure/events/domain-event';
import { ModelName } from '../../../lib/domain/value-objects/model-name';
import { Version } from '../../../lib/domain/value-objects/version';

// Mock implementations for Clean Architecture testing
class MockFunctionModelRepository implements IFunctionModelRepository {
  private models: Map<string, FunctionModel> = new Map();

  async save(model: FunctionModel): Promise<Result<void>> {
    this.models.set(model.modelId, model);
    return Result.ok<void>(undefined);
  }

  async findById(id: string): Promise<Result<FunctionModel | null>> {
    const model = this.models.get(id) || null;
    return Result.ok<FunctionModel | null>(model);
  }

  async addUnifiedNode(modelId: string, node: UnifiedNode): Promise<Result<void>> {
    const model = this.models.get(modelId);
    if (!model) return Result.fail<void>('Model not found');
    
    // This is where the new repository method would add unified nodes
    return Result.ok<void>(undefined);
  }

  // Required interface methods (minimal implementation for tests)
  async findByName(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async findByStatus(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async findAll(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async delete(): Promise<Result<void>> { return Result.ok(undefined); }
  async exists(): Promise<Result<boolean>> { return Result.ok(false); }
  async findByOwner(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async publishModel(): Promise<Result<void>> { return Result.ok(undefined); }
  async archiveModel(): Promise<Result<void>> { return Result.ok(undefined); }
  async findByNamePattern(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async findRecentlyModified(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async countByStatus(): Promise<Result<number>> { return Result.ok(0); }
  async softDelete(): Promise<Result<void>> { return Result.ok(undefined); }
  async restore(): Promise<Result<void>> { return Result.ok(undefined); }
  async findDeleted(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async findPublishedVersions(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async findDraftVersions(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async addNode(): Promise<Result<void>> { return Result.ok(undefined); }
  async addActionNode(): Promise<Result<void>> { return Result.ok(undefined); }
  async searchModelsByNodeContent(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
  async findModelsWithComplexFilters(): Promise<Result<FunctionModel[]>> { return Result.ok([]); }
}

class MockEventBus implements IEventBus {
  async publish(): Promise<Result<void>> {
    return Result.ok<void>(undefined);
  }
}

describe('CreateUnifiedNodeUseCase - TDD Application Layer Tests', () => {
  let useCase: CreateUnifiedNodeUseCase;
  let mockRepository: MockFunctionModelRepository;
  let mockEventBus: MockEventBus;
  let testModel: FunctionModel;

  beforeEach(() => {
    // Arrange - Set up Clean Architecture dependencies
    mockRepository = new MockFunctionModelRepository();
    mockEventBus = new MockEventBus();
    
    // GREEN phase - CreateUnifiedNodeUseCase is now implemented
    useCase = new CreateUnifiedNodeUseCase(mockRepository, mockEventBus);
  });

  describe('Command Structure and Validation', () => {
    describe('CreateNodeCommand Interface', () => {
      it('should define unified command structure with NodeType enum', () => {
        // This test defines the expected command structure
        const command: CreateNodeCommand = {
          modelId: 'test-model-id',
          nodeType: NodeType.IO_NODE, // Uses unified NodeType, not fragmented enums
          name: 'Test Node',
          position: { x: 100, y: 200 },
          userId: 'test-user',
          description: 'Test description',
          typeSpecificData: {} // Optional type-specific configuration
        };

        // Command structure validation will be implemented
        expect(command.nodeType).toBe(NodeType.IO_NODE);
        expect(command.modelId).toBeDefined();
        expect(command.name).toBeDefined();
        expect(command.position).toBeDefined();
        expect(command.userId).toBeDefined();
      });

      it('should validate required fields in command', async () => {
        // Test missing modelId
        const invalidCommand = {
          nodeType: NodeType.IO_NODE,
          name: 'Test Node',
          position: { x: 0, y: 0 },
          userId: 'test-user'
        } as CreateNodeCommand;

        const result = await useCase.execute(invalidCommand);
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Model ID is required');
      });

      it('should validate NodeType enum values', async () => {
        const invalidCommand: CreateNodeCommand = {
          modelId: 'test-model',
          nodeType: 'invalid-type' as NodeType,
          name: 'Test Node',
          position: { x: 0, y: 0 },
          userId: 'test-user'
        };

        const result = await useCase.execute(invalidCommand);
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid node type');
      });
    });
  });

  describe('Unified Node Creation - All 5 Types', () => {
    beforeEach(() => {
      // Create a test model for these scenarios
      testModel = createTestModel();
      mockRepository.save(testModel);
    });

    describe('IO Node Creation', () => {
      it('should create IO_NODE with proper boundary data', async () => {
        // Arrange
        const command: CreateNodeCommand = {
          modelId: testModel.modelId,
          nodeType: NodeType.IO_NODE,
          name: 'Data Input Node',
          position: { x: 100, y: 200 },
          userId: 'test-user',
          description: 'Handles input data processing',
          typeSpecificData: {
            boundaryType: 'input',
            dataContract: {
              inputSchema: { type: 'object' },
              validationRules: {}
            }
          }
        };

        // Act
        const result = await useCase.execute(command);

        // Assert - Verify unified node creation
        expect(result.isSuccess).toBe(true);
        expect(result.value.nodeId).toBeDefined();
        expect(result.value.nodeType).toBe(NodeType.IO_NODE);
        expect(result.value.name).toBe('Data Input Node');
        expect(result.value.typeSpecificData.boundaryType).toBe('input');
      });
    });

    describe('Stage Node Creation', () => {
      it('should create STAGE_NODE with processing configuration', async () => {
        // Arrange
        const command: CreateNodeCommand = {
          modelId: testModel.modelId,
          nodeType: NodeType.STAGE_NODE,
          name: 'Processing Stage',
          position: { x: 300, y: 400 },
          userId: 'test-user',
          typeSpecificData: {
            stageType: 'process',
            executionMode: ExecutionMode.PARALLEL,
            completionCriteria: { timeout: 30000 },
            resourceRequirements: { memory: '512MB' }
          }
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.nodeType).toBe(NodeType.STAGE_NODE);
        expect(result.value.typeSpecificData.stageType).toBe('process');
        expect(result.value.typeSpecificData.executionMode).toBe(ExecutionMode.PARALLEL);
      });
    });

    describe('Tether Node Creation', () => {
      it('should create TETHER_NODE with connection configuration', async () => {
        // Arrange
        const command: CreateNodeCommand = {
          modelId: testModel.modelId,
          nodeType: NodeType.TETHER_NODE,
          name: 'API Tether',
          position: { x: 500, y: 600 },
          userId: 'test-user',
          typeSpecificData: {
            connectionType: 'api',
            endpoint: 'https://api.example.com/data',
            authConfig: { type: 'bearer' },
            retryPolicy: { maxRetries: 3, backoffMs: 1000 }
          }
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.nodeType).toBe(NodeType.TETHER_NODE);
        expect(result.value.typeSpecificData.connectionType).toBe('api');
        expect(result.value.typeSpecificData.endpoint).toBe('https://api.example.com/data');
      });
    });

    describe('KB Node Creation', () => {
      it('should create KB_NODE with knowledge source configuration', async () => {
        // Arrange
        const command: CreateNodeCommand = {
          modelId: testModel.modelId,
          nodeType: NodeType.KB_NODE,
          name: 'Customer KB',
          position: { x: 700, y: 800 },
          userId: 'test-user',
          typeSpecificData: {
            knowledgeSourceType: 'vector_db',
            sourceConfig: {
              connectionString: 'postgresql://localhost:5432/kb',
              embeddingModel: 'text-embedding-ada-002'
            },
            retrievalConfig: {
              maxResults: 10,
              similarityThreshold: 0.8
            }
          }
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.nodeType).toBe(NodeType.KB_NODE);
        expect(result.value.typeSpecificData.knowledgeSourceType).toBe('vector_db');
      });
    });

    describe('Function Model Container Creation', () => {
      it('should create FUNCTION_MODEL_CONTAINER with nested model reference', async () => {
        // Arrange
        const command: CreateNodeCommand = {
          modelId: testModel.modelId,
          nodeType: NodeType.FUNCTION_MODEL_CONTAINER,
          name: 'Nested Workflow',
          position: { x: 900, y: 1000 },
          userId: 'test-user',
          typeSpecificData: {
            nestedModelId: 'nested-workflow-id',
            parameterMapping: {
              input: 'parent.data',
              output: 'result'
            },
            isolationLevel: 'sandbox'
          }
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.nodeType).toBe(NodeType.FUNCTION_MODEL_CONTAINER);
        expect(result.value.typeSpecificData.nestedModelId).toBe('nested-workflow-id');
      });
    });
  });

  describe('Business Rule Enforcement', () => {
    it('should enforce domain validation through UnifiedNode creation', async () => {
      const command: CreateNodeCommand = {
        modelId: testModel.modelId,
        nodeType: NodeType.IO_NODE,
        name: '', // Invalid - empty name should fail domain validation
        position: { x: 0, y: 0 },
        userId: 'test-user'
      };

      const result = await useCase.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Node name is required');
    });

    it('should validate position constraints', async () => {
      const command: CreateNodeCommand = {
        modelId: testModel.modelId,
        nodeType: NodeType.STAGE_NODE,
        name: 'Valid Node',
        position: { x: -100, y: -200 }, // Invalid negative coordinates
        userId: 'test-user'
      };

      const result = await useCase.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid position coordinates');
    });
  });

  describe('Repository Integration', () => {
    it('should use new addUnifiedNode repository method', async () => {
      const addUnifiedNodeSpy = jest.spyOn(mockRepository, 'addUnifiedNode');
      
      const command: CreateNodeCommand = {
        modelId: testModel.modelId,
        nodeType: NodeType.IO_NODE,
        name: 'Test Node',
        position: { x: 100, y: 200 },
        userId: 'test-user'
      };

      await useCase.execute(command);

      expect(addUnifiedNodeSpy).toHaveBeenCalledWith(
        testModel.modelId,
        expect.any(UnifiedNode)
      );
    });

    it('should handle repository failures gracefully', async () => {
      // Mock repository failure
      jest.spyOn(mockRepository, 'addUnifiedNode')
        .mockResolvedValue(Result.fail('Database connection failed'));

      const command: CreateNodeCommand = {
        modelId: testModel.modelId,
        nodeType: NodeType.IO_NODE,
        name: 'Test Node',
        position: { x: 100, y: 200 },
        userId: 'test-user'
      };

      const result = await useCase.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('Domain Event Publishing', () => {
    beforeEach(() => {
      // Create a test model for this test group
      testModel = createTestModel();
      mockRepository.save(testModel);
    });

    it('should publish NodeCreated event with unified node data', async () => {
      const publishSpy = jest.spyOn(mockEventBus, 'publish');
      
      const command: CreateNodeCommand = {
        modelId: testModel.modelId,
        nodeType: NodeType.KB_NODE,
        name: 'Knowledge Node',
        position: { x: 100, y: 200 },
        userId: 'test-user'
      };

      const result = await useCase.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: testModel.modelId,
          data: expect.objectContaining({
            nodeType: NodeType.KB_NODE,
            nodeName: 'Knowledge Node'
          })
        })
      );
    });
  });

  describe('Architectural Compliance', () => {
    it('should use NodeFactory to create appropriate UnifiedNode instances', () => {
      // This test ensures we use the Factory pattern for node creation
      const factorySpy = jest.spyOn(NodeFactory, 'createUnifiedNode');
      
      const command: CreateNodeCommand = {
        modelId: testModel.modelId,
        nodeType: NodeType.TETHER_NODE,
        name: 'Test Tether',
        position: { x: 100, y: 200 },
        userId: 'test-user',
        typeSpecificData: {
          connectionType: 'webhook'
        }
      };

      useCase.execute(command);

      expect(factorySpy).toHaveBeenCalledWith(
        NodeType.TETHER_NODE,
        expect.objectContaining({
          name: 'Test Tether',
          typeSpecificData: expect.objectContaining({
            connectionType: 'webhook'
          })
        })
      );
    });

    it('should return proper Result<NodeCreated> response', async () => {
      const command: CreateNodeCommand = {
        modelId: testModel.modelId,
        nodeType: NodeType.IO_NODE,
        name: 'Result Test Node',
        position: { x: 100, y: 200 },
        userId: 'test-user'
      };

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(Result);
      if (result.isSuccess) {
        expect(result.value).toHaveProperty('nodeId');
        expect(result.value).toHaveProperty('nodeType');
        expect(result.value).toHaveProperty('name');
        expect(result.value).toHaveProperty('position');
        expect(result.value).toHaveProperty('createdAt');
        expect(result.value.nodeType).toBe(NodeType.IO_NODE);
      }
    });
  });
});

// Test Helper Functions
function createTestModel(): FunctionModel {
  // Create test model with required value objects
  const name = ModelName.create('Test Model');
  const version = Version.create('1.0.0');
  
  if (name.isFailure || version.isFailure) {
    throw new Error('Failed to create test model prerequisites');
  }
  
  const result = FunctionModel.create({
    name: name.value,
    version: version.value,
    currentVersion: version.value,
    description: 'Test model for unified node creation',
    status: ModelStatus.DRAFT
  });
  
  if (result.isFailure) {
    throw new Error('Failed to create test model');
  }
  
  return result.value;
}

/**
 * EXPECTED INTERFACES THAT TESTS DEFINE:
 * 
 * 1. CreateNodeCommand:
 *    - modelId: string (required)
 *    - nodeType: NodeType (unified enum, required) 
 *    - name: string (required)
 *    - position: { x: number; y: number } (required)
 *    - userId: string (required)
 *    - description?: string (optional)
 *    - typeSpecificData?: Record<string, any> (optional)
 * 
 * 2. CreateUnifiedNodeUseCase:
 *    - execute(command: CreateNodeCommand): Promise<Result<NodeCreated>>
 *    - Uses UnifiedNode domain entity 
 *    - Uses NodeFactory for creation
 *    - Publishes domain events
 *    - Handles all 5 node types consistently
 * 
 * 3. IFunctionModelRepository extension:
 *    - addUnifiedNode(modelId: string, node: UnifiedNode): Promise<Result<void>>
 * 
 * 4. NodeCreated response:
 *    - nodeId: string
 *    - nodeType: NodeType  
 *    - name: string
 *    - position: { x: number; y: number }
 *    - createdAt: Date
 *    - typeSpecificData?: Record<string, any>
 */