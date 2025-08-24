/**
 * Unit tests for RetryPolicy value object
 * Tests retry strategy configurations and backoff calculations
 */

import { RetryPolicy } from '@/lib/domain/value-objects/retry-policy';
import { ResultTestHelpers, ValidationHelpers } from '../../../utils/test-helpers';

describe('RetryPolicy', () => {
  describe('creation with default values', () => {
    it('should create default retry policy', () => {
      // Act
      const result = RetryPolicy.createDefault();
      
      // Assert
      expect(result).toBeValidResult();
      const policy = result.value;
      expect(policy.maxAttempts).toBe(3);
      expect(policy.strategy).toBe('exponential');
      expect(policy.baseDelayMs).toBe(1000);
      expect(policy.maxDelayMs).toBe(30000);
      expect(policy.enabled).toBe(true);
    });
  });

  describe('creation with custom values', () => {
    it('should create retry policy with valid parameters', () => {
      // Arrange
      const config = {
        maxAttempts: 5,
        strategy: 'linear' as const,
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        multiplier: 1.5,
        jitterMs: 100,
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeValidResult();
      const policy = result.value;
      expect(policy.maxAttempts).toBe(5);
      expect(policy.strategy).toBe('linear');
      expect(policy.baseDelayMs).toBe(2000);
      expect(policy.maxDelayMs).toBe(60000);
      expect(policy.multiplier).toBe(1.5);
      expect(policy.jitterMs).toBe(100);
      expect(policy.enabled).toBe(true);
    });

    it('should create disabled retry policy', () => {
      // Arrange
      const config = {
        maxAttempts: 0,
        strategy: 'immediate' as const,
        baseDelayMs: 0,
        maxDelayMs: 0,
        enabled: false
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.enabled).toBe(false);
    });
  });

  describe('validation failures', () => {
    it('should reject negative max attempts', () => {
      // Arrange
      const config = {
        maxAttempts: -1,
        strategy: 'exponential' as const,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Max attempts must be non-negative');
    });

    it('should reject excessive max attempts', () => {
      // Arrange
      const config = {
        maxAttempts: 101, // Over the limit
        strategy: 'exponential' as const,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Max attempts cannot exceed 100');
    });

    it('should reject negative base delay', () => {
      // Arrange
      const config = {
        maxAttempts: 3,
        strategy: 'exponential' as const,
        baseDelayMs: -1000,
        maxDelayMs: 30000,
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Base delay must be non-negative');
    });

    it('should reject max delay less than base delay', () => {
      // Arrange
      const config = {
        maxAttempts: 3,
        strategy: 'exponential' as const,
        baseDelayMs: 5000,
        maxDelayMs: 3000, // Less than base delay
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Max delay must be greater than or equal to base delay');
    });

    it('should reject invalid multiplier values', () => {
      // Arrange
      const invalidConfigs = [
        { multiplier: 0 },    // Zero multiplier
        { multiplier: -1 },   // Negative multiplier
        { multiplier: 0.5 }   // Less than 1 for exponential
      ];
      
      // Act & Assert
      invalidConfigs.forEach(override => {
        const config = {
          maxAttempts: 3,
          strategy: 'exponential' as const,
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          enabled: true,
          ...override
        };
        
        const result = RetryPolicy.create(config);
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Multiplier must be greater than 1 for exponential strategy');
      });
    });

    it('should reject invalid strategy', () => {
      // Arrange
      const config = {
        maxAttempts: 3,
        strategy: 'invalid' as any,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Invalid retry strategy');
    });
  });

  describe('backoff calculation - exponential strategy', () => {
    it('should calculate exponential backoff correctly', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 5,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          multiplier: 2,
          jitterMs: 0, // No jitter for predictable testing
          enabled: true
        })
      );
      
      // Act & Assert
      expect(policy.calculateDelay(1)).toBe(1000);  // Base delay
      expect(policy.calculateDelay(2)).toBe(2000);  // 1000 * 2^1
      expect(policy.calculateDelay(3)).toBe(4000);  // 1000 * 2^2
      expect(policy.calculateDelay(4)).toBe(8000);  // 1000 * 2^3
      expect(policy.calculateDelay(5)).toBe(16000); // 1000 * 2^4
    });

    it('should cap delay at maxDelayMs', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 10,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 5000, // Cap at 5 seconds
          multiplier: 2,
          jitterMs: 0,
          enabled: true
        })
      );
      
      // Act & Assert
      expect(policy.calculateDelay(1)).toBe(1000);
      expect(policy.calculateDelay(2)).toBe(2000);
      expect(policy.calculateDelay(3)).toBe(4000);
      expect(policy.calculateDelay(4)).toBe(5000); // Capped
      expect(policy.calculateDelay(5)).toBe(5000); // Still capped
    });

    it('should handle custom multiplier', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 4,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          multiplier: 1.5,
          jitterMs: 0,
          enabled: true
        })
      );
      
      // Act & Assert
      expect(policy.calculateDelay(1)).toBe(1000);
      expect(policy.calculateDelay(2)).toBe(1500);  // 1000 * 1.5^1
      expect(policy.calculateDelay(3)).toBe(2250);  // 1000 * 1.5^2
      expect(policy.calculateDelay(4)).toBe(3375);  // 1000 * 1.5^3
    });
  });

  describe('backoff calculation - linear strategy', () => {
    it('should calculate linear backoff correctly', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 5,
          strategy: 'linear',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          jitterMs: 0,
          enabled: true
        })
      );
      
      // Act & Assert
      expect(policy.calculateDelay(1)).toBe(1000);
      expect(policy.calculateDelay(2)).toBe(2000);
      expect(policy.calculateDelay(3)).toBe(3000);
      expect(policy.calculateDelay(4)).toBe(4000);
      expect(policy.calculateDelay(5)).toBe(5000);
    });

    it('should cap linear backoff at maxDelayMs', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 10,
          strategy: 'linear',
          baseDelayMs: 1000,
          maxDelayMs: 3500,
          jitterMs: 0,
          enabled: true
        })
      );
      
      // Act & Assert
      expect(policy.calculateDelay(3)).toBe(3000);
      expect(policy.calculateDelay(4)).toBe(3500); // Capped
      expect(policy.calculateDelay(5)).toBe(3500); // Still capped
    });
  });

  describe('backoff calculation - immediate strategy', () => {
    it('should return zero delay for immediate strategy', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 5,
          strategy: 'immediate',
          baseDelayMs: 0,
          maxDelayMs: 0,
          jitterMs: 0,
          enabled: true
        })
      );
      
      // Act & Assert
      expect(policy.calculateDelay(1)).toBe(0);
      expect(policy.calculateDelay(2)).toBe(0);
      expect(policy.calculateDelay(3)).toBe(0);
    });
  });

  describe('jitter calculation', () => {
    it('should add jitter to calculated delay', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 3,
          strategy: 'linear',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          jitterMs: 500,
          enabled: true
        })
      );
      
      // Act
      const delay1 = policy.calculateDelay(1);
      const delay2 = policy.calculateDelay(1); // Same attempt, different jitter
      
      // Assert - Should be within jitter range
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1500);
      expect(delay2).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeLessThanOrEqual(1500);
      
      // May or may not be the same due to randomness
      // Just verify they're in the correct range
    });

    it('should not exceed maxDelayMs even with jitter', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 5,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 2000,
          multiplier: 2,
          jitterMs: 1000, // Large jitter
          enabled: true
        })
      );
      
      // Act
      const delays = Array.from({ length: 10 }, () => policy.calculateDelay(5));
      
      // Assert - All delays should be <= maxDelayMs
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(2000);
      });
    });
  });

  describe('retry attempt validation', () => {
    it('should validate attempt number is within limits', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 3,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          enabled: true
        })
      );
      
      // Act & Assert
      expect(policy.shouldRetry(1)).toBe(true);
      expect(policy.shouldRetry(2)).toBe(true);
      expect(policy.shouldRetry(3)).toBe(true);
      expect(policy.shouldRetry(4)).toBe(false); // Exceeds max attempts
    });

    it('should not retry when disabled', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 3,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          enabled: false
        })
      );
      
      // Act & Assert
      expect(policy.shouldRetry(1)).toBe(false);
      expect(policy.shouldRetry(2)).toBe(false);
    });
  });

  describe('equality and comparison', () => {
    it('should be equal when all properties match', () => {
      // Arrange
      const config = {
        maxAttempts: 3,
        strategy: 'exponential' as const,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        multiplier: 2,
        jitterMs: 100,
        enabled: true
      };
      
      const policy1 = ResultTestHelpers.expectSuccess(RetryPolicy.create(config));
      const policy2 = ResultTestHelpers.expectSuccess(RetryPolicy.create(config));
      
      // Act & Assert
      expect(policy1.equals(policy2)).toBe(true);
    });

    it('should not be equal when properties differ', () => {
      // Arrange
      const policy1 = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 3,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          enabled: true
        })
      );
      
      const policy2 = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 5, // Different
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          enabled: true
        })
      );
      
      // Act & Assert
      expect(policy1.equals(policy2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to object representation', () => {
      // Arrange
      const policy = ResultTestHelpers.expectSuccess(
        RetryPolicy.create({
          maxAttempts: 5,
          strategy: 'linear',
          baseDelayMs: 2000,
          maxDelayMs: 60000,
          multiplier: 1.5,
          jitterMs: 200,
          enabled: true
        })
      );
      
      // Act
      const obj = policy.toObject();
      
      // Assert
      expect(obj).toEqual({
        maxAttempts: 5,
        strategy: 'linear',
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        multiplier: 1.5,
        jitterMs: 200,
        enabled: true
      });
    });

    it('should create from object representation', () => {
      // Arrange
      const obj = {
        maxAttempts: 4,
        strategy: 'exponential' as const,
        baseDelayMs: 1500,
        maxDelayMs: 45000,
        multiplier: 2.5,
        jitterMs: 300,
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.fromObject(obj);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.toObject()).toEqual(obj);
    });
  });

  describe('boundary testing', () => {
    it('should test numeric boundary conditions', () => {
      // Test maxAttempts boundaries
      ValidationHelpers.testNumericBoundaries(
        (value) => RetryPolicy.create({
          maxAttempts: value,
          strategy: 'immediate',
          baseDelayMs: 0,
          maxDelayMs: 0,
          enabled: true
        }),
        [0, 1, 50, 100], // Valid values
        [-1, 101, 999] // Invalid values
      );
    });

    it('should handle edge cases gracefully', () => {
      // Test with minimal configuration
      const minimalConfig = {
        maxAttempts: 1,
        strategy: 'immediate' as const,
        baseDelayMs: 0,
        maxDelayMs: 0,
        enabled: true
      };
      
      const result = RetryPolicy.create(minimalConfig);
      expect(result).toBeValidResult();
      
      const policy = result.value;
      expect(policy.calculateDelay(1)).toBe(0);
      expect(policy.shouldRetry(2)).toBe(false);
    });
  });
});