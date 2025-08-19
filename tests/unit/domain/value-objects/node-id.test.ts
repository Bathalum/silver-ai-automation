/**
 * Unit tests for NodeId value object
 * Tests UUID validation, generation, and equality
 */

import { NodeId } from '@/lib/domain/value-objects/node-id';

describe('NodeId', () => {
  describe('creation and validation', () => {
    it('should create NodeId with valid UUID', () => {
      // Arrange
      const validUuid = '123e4567-e89b-42d3-a456-426614174000';
      
      // Act
      const result = NodeId.create(validUuid);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.value).toBe(validUuid);
      expect(result.value.toString()).toBe(validUuid);
    });

    it('should create NodeId with UUID v4', () => {
      // Arrange
      const uuidV4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      
      // Act
      const result = NodeId.create(uuidV4);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.value).toBe(uuidV4);
    });

    it('should accept uppercase UUID', () => {
      // Arrange
      const uppercaseUuid = '123E4567-E89B-42D3-A456-426614174000';
      
      // Act
      const result = NodeId.create(uppercaseUuid);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.value).toBe(uppercaseUuid);
    });

    it('should accept mixed case UUID', () => {
      // Arrange
      const mixedCaseUuid = '123e4567-E89B-42d3-A456-426614174000';
      
      // Act
      const result = NodeId.create(mixedCaseUuid);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.value).toBe(mixedCaseUuid);
    });

    it('should trim whitespace from UUID', () => {
      // Arrange
      const uuidWithSpaces = '  123e4567-e89b-42d3-a456-426614174000  ';
      const expectedUuid = '123e4567-e89b-42d3-a456-426614174000';
      
      // Act
      const result = NodeId.create(uuidWithSpaces);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.value).toBe(expectedUuid);
    });

    it('should reject empty string', () => {
      // Act
      const result = NodeId.create('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID cannot be empty');
    });

    it('should reject whitespace-only string', () => {
      // Act
      const result = NodeId.create('   ');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID cannot be empty');
    });

    it('should reject null input', () => {
      // Act
      const result = NodeId.create(null as any);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID cannot be empty');
    });

    it('should reject undefined input', () => {
      // Act
      const result = NodeId.create(undefined as any);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID cannot be empty');
    });

    it('should reject invalid UUID format - too short', () => {
      // Act
      const result = NodeId.create('123e4567-e89b-12d3-a456');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID must be a valid UUID');
    });

    it('should reject invalid UUID format - too long', () => {
      // Act
      const result = NodeId.create('123e4567-e89b-42d3-a456-426614174000-extra');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID must be a valid UUID');
    });

    it('should reject invalid UUID format - missing hyphens', () => {
      // Act
      const result = NodeId.create('123e4567e89b12d3a456426614174000');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID must be a valid UUID');
    });

    it('should reject invalid UUID format - wrong hyphen positions', () => {
      // Act
      const result = NodeId.create('123e45-67-e89b-12d3-a456-426614174000');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID must be a valid UUID');
    });

    it('should reject invalid UUID format - invalid characters', () => {
      // Act
      const result = NodeId.create('123g4567-e89b-12d3-a456-426614174000');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID must be a valid UUID');
    });

    it('should reject UUID v1 format', () => {
      // Arrange - UUID v1 has version '1' in the third group
      const uuidV1 = '123e4567-e89b-11d3-a456-426614174000';
      
      // Act
      const result = NodeId.create(uuidV1);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID must be a valid UUID');
    });

    it('should reject UUID v3 format', () => {
      // Arrange - UUID v3 has version '3' in the third group
      const uuidV3 = '123e4567-e89b-32d3-a456-426614174000';
      
      // Act
      const result = NodeId.create(uuidV3);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node ID must be a valid UUID');
    });

    it('should accept UUID v4 with valid variant bits', () => {
      // Arrange - UUID v4 with variant bits 8, 9, a, b in fourth group
      const uuids = [
        '123e4567-e89b-42d3-8456-426614174000', // variant 8
        '123e4567-e89b-42d3-9456-426614174000', // variant 9
        '123e4567-e89b-42d3-a456-426614174000', // variant a
        '123e4567-e89b-42d3-b456-426614174000'  // variant b
      ];
      
      // Act & Assert
      uuids.forEach(uuid => {
        const result = NodeId.create(uuid);
        expect(result).toBeValidResult();
      });
    });

    it('should reject UUID v4 with invalid variant bits', () => {
      // Arrange - UUID v4 with invalid variant bits (c, d, e, f)
      const invalidUuids = [
        '123e4567-e89b-42d3-c456-426614174000', // variant c
        '123e4567-e89b-42d3-d456-426614174000', // variant d
        '123e4567-e89b-42d3-e456-426614174000', // variant e
        '123e4567-e89b-42d3-f456-426614174000'  // variant f
      ];
      
      // Act & Assert
      invalidUuids.forEach(uuid => {
        const result = NodeId.create(uuid);
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Node ID must be a valid UUID');
      });
    });
  });

  describe('generation', () => {
    it('should generate valid NodeId', () => {
      // Act
      const nodeId = NodeId.generate();
      
      // Assert
      expect(nodeId).toBeInstanceOf(NodeId);
      expect(nodeId.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique NodeIds', () => {
      // Act
      const nodeId1 = NodeId.generate();
      const nodeId2 = NodeId.generate();
      
      // Assert
      expect(nodeId1.value).not.toBe(nodeId2.value);
      expect(nodeId1.equals(nodeId2)).toBe(false);
    });

    it('should generate UUID v4 format', () => {
      // Act
      const nodeId = NodeId.generate();
      
      // Assert
      // Check version bit (position 14, should be '4')
      expect(nodeId.value.charAt(14)).toBe('4');
      
      // Check variant bits (position 19, should be 8, 9, a, or b)
      const variantChar = nodeId.value.charAt(19).toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    it('should generate multiple unique UUIDs in succession', () => {
      // Act
      const nodeIds = Array.from({ length: 100 }, () => NodeId.generate());
      
      // Assert
      const uniqueValues = new Set(nodeIds.map(id => id.value));
      expect(uniqueValues.size).toBe(100); // All should be unique
    });
  });

  describe('equality and comparison', () => {
    it('should be equal when IDs are identical', () => {
      // Arrange
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const nodeId1 = NodeId.create(uuid).value;
      const nodeId2 = NodeId.create(uuid).value;
      
      // Act & Assert
      expect(nodeId1.equals(nodeId2)).toBe(true);
    });

    it('should be equal when IDs differ only in case', () => {
      // Arrange
      const lowerUuid = '123e4567-e89b-42d3-a456-426614174000';
      const upperUuid = '123E4567-E89B-12D3-A456-426614174000';
      const nodeId1 = NodeId.create(lowerUuid).value;
      const nodeId2 = NodeId.create(upperUuid).value;
      
      // Act & Assert
      expect(nodeId1.equals(nodeId2)).toBe(true);
    });

    it('should not be equal when IDs are different', () => {
      // Arrange
      const uuid1 = '123e4567-e89b-42d3-a456-426614174000';
      const uuid2 = '223e4567-e89b-42d3-a456-426614174000';
      const nodeId1 = NodeId.create(uuid1).value;
      const nodeId2 = NodeId.create(uuid2).value;
      
      // Act & Assert
      expect(nodeId1.equals(nodeId2)).toBe(false);
    });

    it('should handle comparison with mixed case UUIDs', () => {
      // Arrange
      const nodeId1 = NodeId.create('123e4567-E89B-42d3-A456-426614174000').value;
      const nodeId2 = NodeId.create('123E4567-e89b-12D3-a456-426614174000').value;
      
      // Act & Assert
      expect(nodeId1.equals(nodeId2)).toBe(true);
    });
  });

  describe('string representation', () => {
    it('should return original UUID as string', () => {
      // Arrange
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const nodeId = NodeId.create(uuid).value;
      
      // Act & Assert
      expect(nodeId.toString()).toBe(uuid);
    });

    it('should preserve case in string representation', () => {
      // Arrange
      const mixedCaseUuid = '123E4567-e89B-12D3-a456-426614174000';
      const nodeId = NodeId.create(mixedCaseUuid).value;
      
      // Act & Assert
      expect(nodeId.toString()).toBe(mixedCaseUuid);
    });

    it('should return same value from value property and toString', () => {
      // Arrange
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const nodeId = NodeId.create(uuid).value;
      
      // Act & Assert
      expect(nodeId.value).toBe(nodeId.toString());
    });
  });

  describe('immutability', () => {
    it('should be immutable after creation', () => {
      // Arrange
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const nodeId = NodeId.create(uuid).value;
      
      // Act & Assert
      expect(() => {
        (nodeId as any)._value = 'changed';
      }).toThrow();
    });

    it('should not allow modification of value property', () => {
      // Arrange
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const nodeId = NodeId.create(uuid).value;
      
      // Act & Assert
      expect(() => {
        (nodeId as any).value = 'changed';
      }).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle minimum valid UUID', () => {
      // Arrange
      const minUuid = '00000000-0000-4000-8000-000000000000';
      
      // Act
      const result = NodeId.create(minUuid);
      
      // Assert
      expect(result).toBeValidResult();
    });

    it('should handle maximum valid UUID', () => {
      // Arrange
      const maxUuid = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
      
      // Act
      const result = NodeId.create(maxUuid);
      
      // Assert
      expect(result).toBeValidResult();
    });

    it('should reject UUID with all zeros except version and variant', () => {
      // Arrange
      const invalidUuid = '00000000-0000-4000-c000-000000000000'; // invalid variant
      
      // Act
      const result = NodeId.create(invalidUuid);
      
      // Assert
      expect(result).toBeFailureResult();
    });

    it('should handle UUID with maximum valid characters in each segment', () => {
      // Arrange
      const validUuid = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
      
      // Act
      const result = NodeId.create(validUuid);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.value).toBe(validUuid);
    });
  });

  describe('toString behavior', () => {
    it('should be compatible with string operations', () => {
      // Arrange
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const nodeId = NodeId.create(uuid).value;
      
      // Act & Assert
      expect(String(nodeId)).toBe(uuid);
      expect(`NodeId: ${nodeId}`).toBe(`NodeId: ${uuid}`);
      expect(nodeId + '-suffix').toBe(`${uuid}-suffix`);
    });

    it('should work with JSON serialization', () => {
      // Arrange
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const nodeId = NodeId.create(uuid).value;
      const obj = { id: nodeId };
      
      // Act
      const json = JSON.stringify(obj);
      
      // Assert
      expect(json).toBe(`{"id":"${uuid}"}`);
    });
  });
});