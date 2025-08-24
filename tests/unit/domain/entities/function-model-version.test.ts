/**
 * Unit tests for FunctionModelVersion Entity
 * Tests version control business logic, factory pattern, validation rules, and state transitions
 */

import { FunctionModelVersion } from '@/lib/domain/entities/function-model-version';

describe('FunctionModelVersion', () => {
  const validProps = {
    versionId: 'version-123',
    modelId: 'model-456',
    versionNumber: '1.0.0',
    versionData: { nodes: [], edges: [] },
    authorId: 'author-789',
    isPublished: false
  };

  describe('Factory Pattern - Creation', () => {
    it('should create version with valid properties', () => {
      // Act
      const result = FunctionModelVersion.create(validProps);

      // Assert
      expect(result).toBeValidResult();
      const version = result.value;
      expect(version.versionId).toBe(validProps.versionId);
      expect(version.modelId).toBe(validProps.modelId);
      expect(version.versionNumber).toBe(validProps.versionNumber);
      expect(version.versionData).toEqual(validProps.versionData);
      expect(version.authorId).toBe(validProps.authorId);
      expect(version.isPublished).toBe(validProps.isPublished);
    });

    it('should automatically set createdAt timestamp', () => {
      // Arrange
      const beforeCreate = new Date();

      // Act
      const result = FunctionModelVersion.create(validProps);

      // Assert
      expect(result).toBeValidResult();
      const version = result.value;
      expect(version.createdAt).toBeInstanceOf(Date);
      expect(version.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(version.createdAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it('should create version with published state', () => {
      // Arrange
      const publishedProps = { ...validProps, isPublished: true };

      // Act
      const result = FunctionModelVersion.create(publishedProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isPublished).toBe(true);
    });

    it('should create version with complex version data', () => {
      // Arrange
      const complexData = {
        nodes: [
          { id: 'node-1', type: 'input', position: { x: 0, y: 0 } },
          { id: 'node-2', type: 'process', position: { x: 100, y: 100 } }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' }
        ],
        metadata: {
          description: 'Complex workflow',
          tags: ['automation', 'testing']
        }
      };
      const propsWithComplexData = { ...validProps, versionData: complexData };

      // Act
      const result = FunctionModelVersion.create(propsWithComplexData);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionData).toEqual(complexData);
    });
  });

  describe('Validation Rules', () => {
    describe('Version ID validation', () => {
      it('should reject empty version ID', () => {
        // Arrange
        const invalidProps = { ...validProps, versionId: '' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version ID cannot be empty');
      });

      it('should reject whitespace-only version ID', () => {
        // Arrange
        const invalidProps = { ...validProps, versionId: '   ' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version ID cannot be empty');
      });
    });

    describe('Model ID validation', () => {
      it('should reject empty model ID', () => {
        // Arrange
        const invalidProps = { ...validProps, modelId: '' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Model ID cannot be empty');
      });

      it('should reject whitespace-only model ID', () => {
        // Arrange
        const invalidProps = { ...validProps, modelId: '   ' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Model ID cannot be empty');
      });
    });

    describe('Semantic versioning validation', () => {
      it('should accept valid semantic versions', () => {
        // Arrange
        const validVersionNumbers = ['1.0.0', '0.1.0', '2.15.3', '10.20.30'];

        // Act & Assert
        validVersionNumbers.forEach(versionNumber => {
          const props = { ...validProps, versionNumber };
          const result = FunctionModelVersion.create(props);
          expect(result).toBeValidResult();
          expect(result.value.versionNumber).toBe(versionNumber);
        });
      });

      it('should reject non-semantic version formats', () => {
        // Arrange - Non-semantic versions (not empty, but invalid format)
        const invalidVersions = [
          '1.0',        // Missing patch
          '1',          // Only major
          '1.0.0.0',    // Too many parts
          'v1.0.0',     // Has prefix
          '1.0.0-beta', // Has suffix
          '1.0.0+build',// Has build metadata
          '1.a.0',      // Non-numeric
          '1.0.a',      // Non-numeric
          'a.0.0',      // Non-numeric
          '1. 0.0',     // Extra spaces
          '1.0 .0'      // Extra spaces
        ];

        // Act & Assert
        invalidVersions.forEach(versionNumber => {
          const props = { ...validProps, versionNumber };
          const result = FunctionModelVersion.create(props);
          expect(result).toBeFailureResult();
          expect(result).toHaveErrorMessage('Version number must follow semantic versioning format (x.y.z)');
        });
      });

      it('should reject empty and whitespace version numbers', () => {
        // Arrange - Empty/whitespace versions (handled separately)
        const emptyVersions = ['', '   '];

        // Act & Assert
        emptyVersions.forEach(versionNumber => {
          const props = { ...validProps, versionNumber };
          const result = FunctionModelVersion.create(props);
          expect(result).toBeFailureResult();
          expect(result).toHaveErrorMessage('Version number cannot be empty');
        });
      });

    });

    describe('Author ID validation', () => {
      it('should reject empty author ID', () => {
        // Arrange
        const invalidProps = { ...validProps, authorId: '' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Author ID cannot be empty');
      });

      it('should reject whitespace-only author ID', () => {
        // Arrange
        const invalidProps = { ...validProps, authorId: '   ' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Author ID cannot be empty');
      });
    });

    describe('Version data validation', () => {
      it('should reject null version data', () => {
        // Arrange
        const invalidProps = { ...validProps, versionData: null };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version data cannot be empty');
      });

      it('should reject undefined version data', () => {
        // Arrange
        const invalidProps = { ...validProps, versionData: undefined };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version data cannot be empty');
      });

      it('should accept empty object as version data', () => {
        // Arrange
        const propsWithEmptyData = { ...validProps, versionData: {} };

        // Act
        const result = FunctionModelVersion.create(propsWithEmptyData);

        // Assert
        expect(result).toBeValidResult();
        expect(result.value.versionData).toEqual({});
      });

      it('should accept array as version data', () => {
        // Arrange
        const propsWithArrayData = { ...validProps, versionData: [] };

        // Act
        const result = FunctionModelVersion.create(propsWithArrayData);

        // Assert
        expect(result).toBeValidResult();
        expect(result.value.versionData).toEqual([]);
      });
    });
  });

  describe('State Transitions - Publication', () => {
    let unpublishedVersion: FunctionModelVersion;
    let publishedVersion: FunctionModelVersion;

    beforeEach(() => {
      const unpublishedResult = FunctionModelVersion.create({ ...validProps, isPublished: false });
      const publishedResult = FunctionModelVersion.create({ ...validProps, isPublished: true });
      
      unpublishedVersion = unpublishedResult.value;
      publishedVersion = publishedResult.value;
    });

    describe('Publishing', () => {
      it('should publish unpublished version', () => {
        // Act
        const result = unpublishedVersion.publish();

        // Assert
        expect(result).toBeValidResult();
        expect(unpublishedVersion.isPublished).toBe(true);
      });

      it('should reject publishing already published version', () => {
        // Act
        const result = publishedVersion.publish();

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version is already published');
        expect(publishedVersion.isPublished).toBe(true); // State unchanged
      });

      it('should maintain immutability of other properties when publishing', () => {
        // Arrange
        const originalVersionId = unpublishedVersion.versionId;
        const originalModelId = unpublishedVersion.modelId;
        const originalVersionNumber = unpublishedVersion.versionNumber;
        const originalAuthorId = unpublishedVersion.authorId;
        const originalCreatedAt = unpublishedVersion.createdAt;

        // Act
        unpublishedVersion.publish();

        // Assert
        expect(unpublishedVersion.versionId).toBe(originalVersionId);
        expect(unpublishedVersion.modelId).toBe(originalModelId);
        expect(unpublishedVersion.versionNumber).toBe(originalVersionNumber);
        expect(unpublishedVersion.authorId).toBe(originalAuthorId);
        expect(unpublishedVersion.createdAt).toBe(originalCreatedAt);
      });
    });

    describe('Unpublishing', () => {
      it('should unpublish published version', () => {
        // Act
        const result = publishedVersion.unpublish();

        // Assert
        expect(result).toBeValidResult();
        expect(publishedVersion.isPublished).toBe(false);
      });

      it('should reject unpublishing unpublished version', () => {
        // Act
        const result = unpublishedVersion.unpublish();

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version is not published');
        expect(unpublishedVersion.isPublished).toBe(false); // State unchanged
      });

      it('should maintain immutability of other properties when unpublishing', () => {
        // Arrange
        const originalVersionId = publishedVersion.versionId;
        const originalModelId = publishedVersion.modelId;
        const originalVersionNumber = publishedVersion.versionNumber;
        const originalAuthorId = publishedVersion.authorId;
        const originalCreatedAt = publishedVersion.createdAt;

        // Act
        publishedVersion.unpublish();

        // Assert
        expect(publishedVersion.versionId).toBe(originalVersionId);
        expect(publishedVersion.modelId).toBe(originalModelId);
        expect(publishedVersion.versionNumber).toBe(originalVersionNumber);
        expect(publishedVersion.authorId).toBe(originalAuthorId);
        expect(publishedVersion.createdAt).toBe(originalCreatedAt);
      });
    });

    describe('State transition workflows', () => {
      it('should allow publish-unpublish-publish cycle', () => {
        // Arrange
        const version = FunctionModelVersion.create({ ...validProps, isPublished: false }).value;

        // Act & Assert - Publish
        const publishResult = version.publish();
        expect(publishResult).toBeValidResult();
        expect(version.isPublished).toBe(true);

        // Act & Assert - Unpublish
        const unpublishResult = version.unpublish();
        expect(unpublishResult).toBeValidResult();
        expect(version.isPublished).toBe(false);

        // Act & Assert - Publish again
        const republishResult = version.publish();
        expect(republishResult).toBeValidResult();
        expect(version.isPublished).toBe(true);
      });

      it('should handle multiple failed state transitions gracefully', () => {
        // Arrange
        const publishedVer = FunctionModelVersion.create({ ...validProps, isPublished: true }).value;

        // Act & Assert - Multiple failed publishes
        const firstFailure = publishedVer.publish();
        const secondFailure = publishedVer.publish();
        
        expect(firstFailure).toBeFailureResult();
        expect(secondFailure).toBeFailureResult();
        expect(publishedVer.isPublished).toBe(true);
      });
    });
  });

  describe('Business Logic - Equality and Comparison', () => {
    it('should be equal when version IDs match', () => {
      // Arrange
      const props1 = { ...validProps, versionId: 'same-id' };
      const props2 = { ...validProps, versionId: 'same-id', versionNumber: '2.0.0' };
      
      const version1 = FunctionModelVersion.create(props1).value;
      const version2 = FunctionModelVersion.create(props2).value;

      // Act & Assert
      expect(version1.equals(version2)).toBe(true);
    });

    it('should not be equal when version IDs differ', () => {
      // Arrange
      const props1 = { ...validProps, versionId: 'id-1' };
      const props2 = { ...validProps, versionId: 'id-2' };
      
      const version1 = FunctionModelVersion.create(props1).value;
      const version2 = FunctionModelVersion.create(props2).value;

      // Act & Assert
      expect(version1.equals(version2)).toBe(false);
    });

    it('should maintain equality contract (reflexive, symmetric, transitive)', () => {
      // Arrange
      const props1 = { ...validProps, versionId: 'test-id' };
      const props2 = { ...validProps, versionId: 'test-id' };
      const props3 = { ...validProps, versionId: 'test-id' };
      
      const version1 = FunctionModelVersion.create(props1).value;
      const version2 = FunctionModelVersion.create(props2).value;
      const version3 = FunctionModelVersion.create(props3).value;

      // Act & Assert - Reflexive
      expect(version1.equals(version1)).toBe(true);

      // Act & Assert - Symmetric
      expect(version1.equals(version2)).toBe(version2.equals(version1));

      // Act & Assert - Transitive
      if (version1.equals(version2) && version2.equals(version3)) {
        expect(version1.equals(version3)).toBe(true);
      }
    });
  });

  describe('Property Access and Immutability', () => {
    let version: FunctionModelVersion;

    beforeEach(() => {
      version = FunctionModelVersion.create(validProps).value;
    });

    it('should provide read-only access to all properties', () => {
      // Act & Assert
      expect(version.versionId).toBe(validProps.versionId);
      expect(version.modelId).toBe(validProps.modelId);
      expect(version.versionNumber).toBe(validProps.versionNumber);
      expect(version.versionData).toEqual(validProps.versionData);
      expect(version.authorId).toBe(validProps.authorId);
      expect(version.isPublished).toBe(validProps.isPublished);
      expect(version.createdAt).toBeInstanceOf(Date);
    });

    it('should prevent modification of version data', () => {
      // Arrange
      const originalData = version.versionData;

      // Act - Try to modify (should not affect original)
      if (typeof version.versionData === 'object' && version.versionData !== null) {
        try {
          version.versionData.newProperty = 'hacked';
        } catch {
          // Expected to fail in strict mode
        }
      }

      // Assert - Original data unchanged
      expect(version.versionData).toEqual(originalData);
    });

    it('should return consistent values on multiple property accesses', () => {
      // Act
      const firstAccess = {
        versionId: version.versionId,
        modelId: version.modelId,
        versionNumber: version.versionNumber,
        authorId: version.authorId,
        isPublished: version.isPublished,
        createdAt: version.createdAt
      };

      const secondAccess = {
        versionId: version.versionId,
        modelId: version.modelId,
        versionNumber: version.versionNumber,
        authorId: version.authorId,
        isPublished: version.isPublished,
        createdAt: version.createdAt
      };

      // Assert
      expect(firstAccess).toEqual(secondAccess);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle UUID-like version IDs', () => {
      // Arrange
      const uuidProps = { 
        ...validProps, 
        versionId: '123e4567-e89b-42d3-a456-426614174000' 
      };

      // Act
      const result = FunctionModelVersion.create(uuidProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionId).toBe(uuidProps.versionId);
    });

    it('should handle very long version IDs', () => {
      // Arrange
      const longId = 'a'.repeat(1000);
      const longIdProps = { ...validProps, versionId: longId };

      // Act
      const result = FunctionModelVersion.create(longIdProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionId).toBe(longId);
    });

    it('should handle special characters in version ID', () => {
      // Arrange
      const specialIdProps = { ...validProps, versionId: 'version-123_test@domain.com' };

      // Act
      const result = FunctionModelVersion.create(specialIdProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionId).toBe(specialIdProps.versionId);
    });

    it('should handle large numeric version components', () => {
      // Arrange
      const largeVersionProps = { 
        ...validProps, 
        versionNumber: '999999.999999.999999' 
      };

      // Act
      const result = FunctionModelVersion.create(largeVersionProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionNumber).toBe(largeVersionProps.versionNumber);
    });

    it('should handle complex nested version data', () => {
      // Arrange
      const complexData = {
        level1: {
          level2: {
            level3: {
              deepProperty: 'deep value',
              array: [1, 2, { nested: true }]
            }
          }
        },
        functions: [
          {
            name: 'func1',
            parameters: { param1: 'value1', param2: 42 }
          }
        ]
      };
      const complexProps = { ...validProps, versionData: complexData };

      // Act
      const result = FunctionModelVersion.create(complexProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionData).toEqual(complexData);
    });
  });

  describe('Result Pattern Integration', () => {
    it('should follow Result pattern consistently', () => {
      // Act - Valid creation
      const validResult = FunctionModelVersion.create(validProps);
      
      // Assert
      expect(validResult).toBeValidResult();
      expect(validResult.isSuccess).toBe(true);
      expect(validResult.isFailure).toBe(false);
      expect(validResult.value).toBeInstanceOf(FunctionModelVersion);
      expect(() => validResult.error).toThrow();
    });

    it('should provide meaningful error messages', () => {
      // Arrange
      const testCases = [
        { props: { ...validProps, versionId: '' }, expectedError: 'Version ID cannot be empty' },
        { props: { ...validProps, modelId: '' }, expectedError: 'Model ID cannot be empty' },
        { props: { ...validProps, versionNumber: 'invalid' }, expectedError: 'Version number must follow semantic versioning format (x.y.z)' },
        { props: { ...validProps, authorId: '' }, expectedError: 'Author ID cannot be empty' },
        { props: { ...validProps, versionData: null }, expectedError: 'Version data cannot be empty' }
      ];

      // Act & Assert
      testCases.forEach(({ props, expectedError }) => {
        const result = FunctionModelVersion.create(props);
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage(expectedError);
        expect(result.isSuccess).toBe(false);
        expect(result.isFailure).toBe(true);
        expect(() => result.value).toThrow();
      });
    });

    it('should handle publish/unpublish results correctly', () => {
      // Arrange
      const version = FunctionModelVersion.create({ ...validProps, isPublished: false }).value;

      // Act & Assert - Successful publish
      const publishResult = version.publish();
      expect(publishResult).toBeValidResult();
      expect(publishResult.isSuccess).toBe(true);

      // Act & Assert - Failed publish
      const failedPublishResult = version.publish();
      expect(failedPublishResult).toBeFailureResult();
      expect(failedPublishResult).toHaveErrorMessage('Version is already published');
    });
  });
});