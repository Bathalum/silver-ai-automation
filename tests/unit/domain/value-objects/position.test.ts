/**
 * Unit tests for Position value object
 * Tests coordinate validation, movement operations, and geometric calculations
 */

import { Position } from '@/lib/domain/value-objects/position';

describe('Position', () => {
  describe('creation and validation', () => {
    it('should create position with valid coordinates', () => {
      // Act
      const result = Position.create(100, 200);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.x).toBe(100);
      expect(result.value.y).toBe(200);
    });

    it('should create position with zero coordinates', () => {
      // Act
      const result = Position.create(0, 0);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.x).toBe(0);
      expect(result.value.y).toBe(0);
    });

    it('should create position with negative coordinates', () => {
      // Act
      const result = Position.create(-50, -75);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.x).toBe(-50);
      expect(result.value.y).toBe(-75);
    });

    it('should create position with decimal coordinates', () => {
      // Act
      const result = Position.create(123.45, 678.90);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.x).toBe(123.45);
      expect(result.value.y).toBe(678.90);
    });

    it('should create position at minimum boundary', () => {
      // Act
      const result = Position.create(-10000, -10000);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.x).toBe(-10000);
      expect(result.value.y).toBe(-10000);
    });

    it('should create position at maximum boundary', () => {
      // Act
      const result = Position.create(10000, 10000);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.x).toBe(10000);
      expect(result.value.y).toBe(10000);
    });

    it('should reject infinite X coordinate', () => {
      // Act
      const result = Position.create(Infinity, 100);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Position coordinates must be finite numbers');
    });

    it('should reject infinite Y coordinate', () => {
      // Act
      const result = Position.create(100, Infinity);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Position coordinates must be finite numbers');
    });

    it('should reject negative infinite coordinates', () => {
      // Act
      const result = Position.create(-Infinity, -Infinity);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Position coordinates must be finite numbers');
    });

    it('should reject NaN X coordinate', () => {
      // Act
      const result = Position.create(NaN, 100);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Position coordinates must be finite numbers');
    });

    it('should reject NaN Y coordinate', () => {
      // Act
      const result = Position.create(100, NaN);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Position coordinates must be finite numbers');
    });

    it('should reject X coordinate below minimum', () => {
      // Act
      const result = Position.create(-10001, 100);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('X coordinate must be between -10000 and 10000');
    });

    it('should reject Y coordinate below minimum', () => {
      // Act
      const result = Position.create(100, -10001);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Y coordinate must be between -10000 and 10000');
    });

    it('should reject X coordinate above maximum', () => {
      // Act
      const result = Position.create(10001, 100);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('X coordinate must be between -10000 and 10000');
    });

    it('should reject Y coordinate above maximum', () => {
      // Act
      const result = Position.create(100, 10001);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Y coordinate must be between -10000 and 10000');
    });

    it('should reject both coordinates out of bounds', () => {
      // Act
      const result = Position.create(-20000, 20000);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('X coordinate must be between -10000 and 10000');
    });
  });

  describe('zero position factory', () => {
    it('should create position at origin', () => {
      // Act
      const position = Position.zero();
      
      // Assert
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
    });

    it('should return same zero position values on multiple calls', () => {
      // Act
      const position1 = Position.zero();
      const position2 = Position.zero();
      
      // Assert
      expect(position1.x).toBe(position2.x);
      expect(position1.y).toBe(position2.y);
      expect(position1.equals(position2)).toBe(true);
    });
  });

  describe('movement operations', () => {
    let basePosition: Position;

    beforeEach(() => {
      basePosition = Position.create(100, 200).value;
    });

    describe('moveTo', () => {
      it('should move to new absolute position', () => {
        // Act
        const result = basePosition.moveTo(300, 400);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.x).toBe(300);
        expect(result.value.y).toBe(400);
      });

      it('should move to origin', () => {
        // Act
        const result = basePosition.moveTo(0, 0);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.x).toBe(0);
        expect(result.value.y).toBe(0);
      });

      it('should move to negative coordinates', () => {
        // Act
        const result = basePosition.moveTo(-150, -250);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.x).toBe(-150);
        expect(result.value.y).toBe(-250);
      });

      it('should reject move to invalid coordinates', () => {
        // Act
        const result = basePosition.moveTo(15000, 200);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('X coordinate must be between -10000 and 10000');
      });

      it('should not modify original position', () => {
        // Act
        basePosition.moveTo(500, 600);
        
        // Assert
        expect(basePosition.x).toBe(100);
        expect(basePosition.y).toBe(200);
      });
    });

    describe('moveBy', () => {
      it('should move by positive delta', () => {
        // Act
        const result = basePosition.moveBy(50, 75);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.x).toBe(150);
        expect(result.value.y).toBe(275);
      });

      it('should move by negative delta', () => {
        // Act
        const result = basePosition.moveBy(-30, -40);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.x).toBe(70);
        expect(result.value.y).toBe(160);
      });

      it('should move by zero delta', () => {
        // Act
        const result = basePosition.moveBy(0, 0);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.x).toBe(100);
        expect(result.value.y).toBe(200);
      });

      it('should move by decimal delta', () => {
        // Act
        const result = basePosition.moveBy(12.5, -7.25);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.x).toBe(112.5);
        expect(result.value.y).toBe(192.75);
      });

      it('should reject move that would exceed boundaries', () => {
        // Arrange
        const edgePosition = Position.create(9500, 9500).value;
        
        // Act
        const result = edgePosition.moveBy(600, 600);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('X coordinate must be between -10000 and 10000');
      });

      it('should reject move that would go below boundaries', () => {
        // Arrange
        const edgePosition = Position.create(-9500, -9500).value;
        
        // Act
        const result = edgePosition.moveBy(-600, -600);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('X coordinate must be between -10000 and 10000');
      });

      it('should not modify original position', () => {
        // Act
        basePosition.moveBy(100, 100);
        
        // Assert
        expect(basePosition.x).toBe(100);
        expect(basePosition.y).toBe(200);
      });
    });
  });

  describe('distance calculations', () => {
    it('should calculate distance to same position', () => {
      // Arrange
      const position = Position.create(100, 200).value;
      
      // Act
      const distance = position.distanceTo(position);
      
      // Assert
      expect(distance).toBe(0);
    });

    it('should calculate distance along X axis', () => {
      // Arrange
      const pos1 = Position.create(0, 0).value;
      const pos2 = Position.create(3, 0).value;
      
      // Act
      const distance = pos1.distanceTo(pos2);
      
      // Assert
      expect(distance).toBe(3);
    });

    it('should calculate distance along Y axis', () => {
      // Arrange
      const pos1 = Position.create(0, 0).value;
      const pos2 = Position.create(0, 4).value;
      
      // Act
      const distance = pos1.distanceTo(pos2);
      
      // Assert
      expect(distance).toBe(4);
    });

    it('should calculate distance using Pythagorean theorem', () => {
      // Arrange
      const pos1 = Position.create(0, 0).value;
      const pos2 = Position.create(3, 4).value;
      
      // Act
      const distance = pos1.distanceTo(pos2);
      
      // Assert
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should calculate distance with negative coordinates', () => {
      // Arrange
      const pos1 = Position.create(-1, -1).value;
      const pos2 = Position.create(2, 3).value;
      
      // Act
      const distance = pos1.distanceTo(pos2);
      
      // Assert
      expect(distance).toBe(5); // sqrt((2-(-1))² + (3-(-1))²) = sqrt(9+16) = 5
    });

    it('should calculate distance with decimal coordinates', () => {
      // Arrange
      const pos1 = Position.create(1.5, 2.5).value;
      const pos2 = Position.create(4.5, 6.5).value;
      
      // Act
      const distance = pos1.distanceTo(pos2);
      
      // Assert
      expect(distance).toBe(5); // sqrt((4.5-1.5)² + (6.5-2.5)²) = sqrt(9+16) = 5
    });

    it('should calculate symmetric distance', () => {
      // Arrange
      const pos1 = Position.create(10, 20).value;
      const pos2 = Position.create(30, 40).value;
      
      // Act
      const distance1to2 = pos1.distanceTo(pos2);
      const distance2to1 = pos2.distanceTo(pos1);
      
      // Assert
      expect(distance1to2).toBe(distance2to1);
    });

    it('should calculate large distances correctly', () => {
      // Arrange
      const pos1 = Position.create(-5000, -5000).value;
      const pos2 = Position.create(5000, 5000).value;
      
      // Act
      const distance = pos1.distanceTo(pos2);
      
      // Assert
      expect(distance).toBeCloseTo(14142.135623730951, 5); // sqrt(10000² + 10000²)
    });
  });

  describe('equality and comparison', () => {
    it('should be equal when coordinates are identical', () => {
      // Arrange
      const pos1 = Position.create(100, 200).value;
      const pos2 = Position.create(100, 200).value;
      
      // Act & Assert
      expect(pos1.equals(pos2)).toBe(true);
    });

    it('should not be equal when X coordinates differ', () => {
      // Arrange
      const pos1 = Position.create(100, 200).value;
      const pos2 = Position.create(101, 200).value;
      
      // Act & Assert
      expect(pos1.equals(pos2)).toBe(false);
    });

    it('should not be equal when Y coordinates differ', () => {
      // Arrange
      const pos1 = Position.create(100, 200).value;
      const pos2 = Position.create(100, 201).value;
      
      // Act & Assert
      expect(pos1.equals(pos2)).toBe(false);
    });

    it('should not be equal when both coordinates differ', () => {
      // Arrange
      const pos1 = Position.create(100, 200).value;
      const pos2 = Position.create(300, 400).value;
      
      // Act & Assert
      expect(pos1.equals(pos2)).toBe(false);
    });

    it('should be equal with decimal coordinates', () => {
      // Arrange
      const pos1 = Position.create(123.456, 789.012).value;
      const pos2 = Position.create(123.456, 789.012).value;
      
      // Act & Assert
      expect(pos1.equals(pos2)).toBe(true);
    });

    it('should be equal with negative coordinates', () => {
      // Arrange
      const pos1 = Position.create(-150, -250).value;
      const pos2 = Position.create(-150, -250).value;
      
      // Act & Assert
      expect(pos1.equals(pos2)).toBe(true);
    });

    it('should be equal at origin', () => {
      // Arrange
      const pos1 = Position.create(0, 0).value;
      const pos2 = Position.zero();
      
      // Act & Assert
      expect(pos1.equals(pos2)).toBe(true);
    });
  });

  describe('string representation', () => {
    it('should format positive coordinates', () => {
      // Arrange
      const position = Position.create(100, 200).value;
      
      // Act & Assert
      expect(position.toString()).toBe('(100, 200)');
    });

    it('should format negative coordinates', () => {
      // Arrange
      const position = Position.create(-50, -75).value;
      
      // Act & Assert
      expect(position.toString()).toBe('(-50, -75)');
    });

    it('should format zero coordinates', () => {
      // Arrange
      const position = Position.zero();
      
      // Act & Assert
      expect(position.toString()).toBe('(0, 0)');
    });

    it('should format decimal coordinates', () => {
      // Arrange
      const position = Position.create(123.45, 678.90).value;
      
      // Act & Assert
      expect(position.toString()).toBe('(123.45, 678.9)');
    });

    it('should format mixed sign coordinates', () => {
      // Arrange
      const position = Position.create(-100, 200).value;
      
      // Act & Assert
      expect(position.toString()).toBe('(-100, 200)');
    });
  });

  describe('object conversion', () => {
    it('should convert to object with x and y properties', () => {
      // Arrange
      const position = Position.create(150, 250).value;
      
      // Act
      const obj = position.toObject();
      
      // Assert
      expect(obj).toEqual({ x: 150, y: 250 });
    });

    it('should convert negative coordinates to object', () => {
      // Arrange
      const position = Position.create(-75, -125).value;
      
      // Act
      const obj = position.toObject();
      
      // Assert
      expect(obj).toEqual({ x: -75, y: -125 });
    });

    it('should convert decimal coordinates to object', () => {
      // Arrange
      const position = Position.create(12.34, 56.78).value;
      
      // Act
      const obj = position.toObject();
      
      // Assert
      expect(obj).toEqual({ x: 12.34, y: 56.78 });
    });

    it('should create independent object', () => {
      // Arrange
      const position = Position.create(100, 200).value;
      
      // Act
      const obj = position.toObject();
      obj.x = 999;
      obj.y = 888;
      
      // Assert
      expect(position.x).toBe(100);
      expect(position.y).toBe(200);
    });

    it('should work with JSON serialization', () => {
      // Arrange
      const position = Position.create(123, 456).value;
      const wrapper = { position: position.toObject() };
      
      // Act
      const json = JSON.stringify(wrapper);
      
      // Assert
      expect(json).toBe('{"position":{"x":123,"y":456}}');
    });
  });

  describe('immutability', () => {
    it('should be immutable after creation', () => {
      // Arrange
      const position = Position.create(100, 200).value;
      const originalX = position.x;
      const originalY = position.y;
      
      // Act & Assert - Object.freeze prevents modification of properties
      expect(() => {
        (position as any)._x = 999;
      }).toThrow(TypeError);
      
      expect(() => {
        (position as any)._y = 888;
      }).toThrow(TypeError);
      
      // Public interface should remain unchanged
      expect(position.x).toBe(originalX);
      expect(position.y).toBe(originalY);
    });

    it('should not allow modification of coordinate properties', () => {
      // Arrange
      const position = Position.create(100, 200).value;
      
      // Act & Assert
      expect(() => {
        (position as any).x = 999;
      }).toThrow();
      
      expect(() => {
        (position as any).y = 888;
      }).toThrow();
    });

    it('should return new instances from movement operations', () => {
      // Arrange
      const original = Position.create(100, 200).value;
      
      // Act
      const moved = original.moveBy(10, 20).value;
      
      // Assert
      expect(moved).not.toBe(original);
      expect(original.x).toBe(100);
      expect(original.y).toBe(200);
      expect(moved.x).toBe(110);
      expect(moved.y).toBe(220);
    });
  });

  describe('edge cases and boundaries', () => {
    it('should handle position at exact boundary values', () => {
      // Arrange & Act
      const minPosition = Position.create(-10000, -10000).value;
      const maxPosition = Position.create(10000, 10000).value;
      
      // Assert
      expect(minPosition.x).toBe(-10000);
      expect(minPosition.y).toBe(-10000);
      expect(maxPosition.x).toBe(10000);
      expect(maxPosition.y).toBe(10000);
    });

    it('should handle very small decimal differences', () => {
      // Arrange
      const pos1 = Position.create(0.1, 0.2).value;
      const pos2 = Position.create(0.1000001, 0.2000001).value;
      
      // Act & Assert
      expect(pos1.equals(pos2)).toBe(false);
      expect(pos1.distanceTo(pos2)).toBeGreaterThan(0);
    });

    it('should handle floating point precision correctly', () => {
      // Arrange
      const position = Position.create(0.1 + 0.2, 0.4 + 0.1).value; // Common floating point precision issue
      
      // Act & Assert
      expect(position.x).toBeCloseTo(0.3, 10);
      expect(position.y).toBeCloseTo(0.5, 10);
    });
  });
});