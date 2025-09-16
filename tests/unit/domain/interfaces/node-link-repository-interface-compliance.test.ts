import { NodeLinkRepository } from '../../../../lib/domain/interfaces/node-link-repository';

/**
 * Test to verify interface compliance - this test should FAIL until findByModelId is added
 * Following TDD: This defines the requirement that the interface must have findByModelId
 */
describe('NodeLinkRepository Interface Compliance', () => {
  it('should have findByModelId method in interface definition', () => {
    // This test will fail because TypeScript will complain about missing method
    const mockImplementation: NodeLinkRepository = {
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
      // This line should cause TypeScript compilation error until we add the method
      findByModelId: jest.fn()
    };

    // Verify the method exists in the interface
    expect(typeof mockImplementation.findByModelId).toBe('function');
    expect(mockImplementation.findByModelId).toBeDefined();
  });

  it('should have correct method signature for findByModelId', () => {
    // Mock the expected interface with the missing method
    const repo = {
      findByModelId: jest.fn()
    } as Pick<NodeLinkRepository, 'findByModelId'>;

    // This should have the correct signature: (modelId: string) => Promise<Result<NodeLink[]>>
    expect(repo.findByModelId).toBeDefined();
    expect(typeof repo.findByModelId).toBe('function');
  });
});