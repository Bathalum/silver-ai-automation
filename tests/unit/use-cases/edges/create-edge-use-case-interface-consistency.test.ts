import { CreateEdgeUseCase } from '../../../../lib/use-cases/edges/create-edge-use-case';
import { NodeLinkRepository } from '../../../../lib/domain/interfaces/node-link-repository';
import { EdgeValidationService } from '../../../../lib/domain/services/edge-validation-service';
import { Result } from '../../../../lib/domain/shared/result';

/**
 * Test to verify CreateEdgeUseCase uses the correct domain interface
 * Following TDD: This test should FAIL until CreateEdgeUseCase uses NodeLinkRepository from domain
 */
describe('CreateEdgeUseCase Interface Consistency', () => {
  it('should accept domain NodeLinkRepository interface', () => {
    // This test should fail if CreateEdgeUseCase doesn't use the domain interface
    const mockRepository: NodeLinkRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findBySourceEntity: jest.fn(),
      findByTargetEntity: jest.fn(),
      findBySourceNode: jest.fn(),
      findByTargetNode: jest.fn(),
      findByLinkType: jest.fn(),
      findCrossFeatureLinks: jest.fn(),
      findByFeaturePair: jest.fn(),
      findStrongLinks: jest.fn(),
      findWeakLinks: jest.fn(),
      findBidirectionalLinks: jest.fn(),
      bulkSave: jest.fn(),
      bulkDelete: jest.fn(),
      countByLinkType: jest.fn(),
      countCrossFeatureLinks: jest.fn(),
      findByModelId: jest.fn()
    };

    const mockEdgeValidationService = new EdgeValidationService();
    const mockEventBus = { publish: jest.fn() };

    // This constructor call should NOT cause TypeScript errors
    // If it does, it means CreateEdgeUseCase is not using the domain interface
    expect(() => {
      const useCase = new CreateEdgeUseCase(
        mockEdgeValidationService,
        mockRepository, // This line should work with domain interface
        mockEventBus
      );
      expect(useCase).toBeDefined();
    }).not.toThrow();
  });

  it('should use domain interface methods correctly', async () => {
    const mockRepository: NodeLinkRepository = {
      findById: jest.fn().mockResolvedValue(Result.ok({})),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      delete: jest.fn(),
      exists: jest.fn(),
      findBySourceEntity: jest.fn(),
      findByTargetEntity: jest.fn(),
      findBySourceNode: jest.fn(),
      findByTargetNode: jest.fn(),
      findByLinkType: jest.fn(),
      findCrossFeatureLinks: jest.fn(),
      findByFeaturePair: jest.fn(),
      findStrongLinks: jest.fn(),
      findWeakLinks: jest.fn(),
      findBidirectionalLinks: jest.fn(),
      bulkSave: jest.fn(),
      bulkDelete: jest.fn(),
      countByLinkType: jest.fn(),
      countCrossFeatureLinks: jest.fn(),
      findByModelId: jest.fn().mockResolvedValue(Result.ok([]))
    };

    const mockEdgeValidationService = {
      validateConnection: jest.fn().mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      ),
      validateCircularDependency: jest.fn().mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      )
    } as any;

    const mockEventBus = { publish: jest.fn() };

    const useCase = new CreateEdgeUseCase(
      mockEdgeValidationService,
      mockRepository,
      mockEventBus
    );

    // Test should pass if the use case can call domain interface methods
    const command = {
      sourceNodeId: '12345678-1234-4567-8901-123456789012',
      targetNodeId: '12345678-1234-4567-8901-123456789013',
      sourceHandle: 'right',
      targetHandle: 'left',
      sourceNodeType: 'ioNode',
      targetNodeType: 'stageNode',
      modelId: 'model-789',
      userId: 'user-101'
    };

    await useCase.execute(command);
    
    // Verify that domain interface methods were called
    expect(mockRepository.findByModelId).toHaveBeenCalledWith('model-789');
    expect(mockRepository.save).toHaveBeenCalled();
  });
});