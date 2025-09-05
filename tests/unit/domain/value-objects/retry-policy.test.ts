/**
 * Unit tests for RetryPolicy value object
 * Tests retry strategy configurations and backoff calculations
 */

import { RetryPolicy, BackoffStrategy, RetryPolicyConfig, LegacyRetryPolicyConfig } from '@/lib/domain/value-objects/retry-policy';

describe('RetryPolicy', () => {
  describe('creation and validation', () => {
    it('should create default RetryPolicy with valid configuration', () => {
      // Act
      const result = RetryPolicy.createDefault();
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.maxAttempts).toBe(3);
      expect(result.value.strategy).toBe('exponential');
      expect(result.value.baseDelayMs).toBe(1000);
      expect(result.value.maxDelayMs).toBe(30000);
      expect(result.value.multiplier).toBe(2.0);
      expect(result.value.jitterMs).toBe(0);
      expect(result.value.enabled).toBe(true);
    });

    it('should create RetryPolicy with valid configuration', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 5,
        strategy: 'linear',
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
      expect(result.value.maxAttempts).toBe(5);
      expect(result.value.strategy).toBe('linear');
      expect(result.value.baseDelayMs).toBe(2000);
      expect(result.value.maxDelayMs).toBe(60000);
      expect(result.value.multiplier).toBe(1.5);
      expect(result.value.jitterMs).toBe(100);
      expect(result.value.enabled).toBe(true);
    });

    it('should create RetryPolicy with minimum valid values', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 0,
        strategy: 'immediate',
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

    it('should create RetryPolicy with maximum valid values', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 100,
        strategy: 'exponential',
        baseDelayMs: 300000,
        maxDelayMs: 300000,
        multiplier: 10.0,
        jitterMs: 50000,
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.maxAttempts).toBe(100);
      expect(result.value.maxDelayMs).toBe(300000);
    });

    it('should handle optional multiplier and jitter defaults', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
        // multiplier and jitterMs omitted
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.multiplier).toBe(2.0); // default
      expect(result.value.jitterMs).toBe(0); // default
    });

    it('should reject negative max attempts', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: -1,
        strategy: 'exponential',
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

    it('should reject max attempts exceeding limit', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 101,
        strategy: 'exponential',
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

    it('should reject invalid strategy', () => {
      // Arrange
      const config: RetryPolicyConfig = {
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

    it('should reject negative base delay', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 3,
        strategy: 'exponential',
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
      const config: RetryPolicyConfig = {
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 5000,
        maxDelayMs: 3000,
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Max delay must be greater than or equal to base delay');
    });

    it('should reject max delay exceeding limit', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 300001, // Over limit
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Max delay cannot exceed 300000ms');
    });

    it('should reject invalid multiplier for exponential strategy', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        multiplier: 0.5, // Must be > 1 for exponential
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Multiplier must be greater than 1 for exponential strategy');
    });

    it('should reject multiplier outside range', () => {
      // Arrange - Test below minimum (exponential strategy specific error)
      const belowMinConfig: RetryPolicyConfig = {
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true,
        multiplier: 0.5
      };
      
      const belowMinResult = RetryPolicy.create(belowMinConfig);
      expect(belowMinResult).toBeFailureResult();
      expect(belowMinResult.error).toContain('Multiplier must be greater than 1 for exponential strategy');
      
      // Arrange - Test above maximum (generic range error)
      const aboveMaxConfig: RetryPolicyConfig = {
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true,
        multiplier: 15.0
      };
      
      const aboveMaxResult = RetryPolicy.create(aboveMaxConfig);
      expect(aboveMaxResult).toBeFailureResult();
      expect(aboveMaxResult.error).toContain('Multiplier must be between 1.0 and 10.0');
    });

    it('should reject negative jitter', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        jitterMs: -100,
        enabled: true
      };
      
      // Act
      const result = RetryPolicy.create(config);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Jitter must be non-negative');
    });
  });

  describe('legacy config support', () => {
    it('should create RetryPolicy from legacy configuration', () => {
      // Arrange
      const legacyConfig: LegacyRetryPolicyConfig = {
        maxAttempts: 5,
        backoffStrategy: 'linear',
        backoffDelay: 2000,
        failureThreshold: 3
      };
      
      // Act
      const result = RetryPolicy.create(legacyConfig);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.maxAttempts).toBe(5);
      expect(result.value.strategy).toBe('linear');
      expect(result.value.baseDelayMs).toBe(2000);
      expect(result.value.enabled).toBe(true);
    });

    it('should provide legacy property getters', () => {
      // Arrange
      const policy = RetryPolicy.createDefault().value;
      
      // Act & Assert
      expect(policy.backoffStrategy).toBe('exponential');
      expect(policy.backoffDelay).toBe(1000);
      expect(policy.failureThreshold).toBe(3);
    });
  });

  describe('delay calculations', () => {
    describe('immediate strategy', () => {
      it('should return zero delay for immediate strategy', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 3,
          strategy: 'immediate',
          baseDelayMs: 1000, // Should be ignored
          maxDelayMs: 30000,
          enabled: true
        }).value;
        
        // Act & Assert
        expect(policy.calculateDelay(1)).toBe(0);
        expect(policy.calculateDelay(2)).toBe(0);
        expect(policy.calculateDelay(3)).toBe(0);
      });

      it('should return zero delay when disabled', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 3,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          enabled: false
        }).value;
        
        // Act & Assert
        expect(policy.calculateDelay(1)).toBe(0);
        expect(policy.calculateDelay(2)).toBe(0);
        expect(policy.calculateDelay(3)).toBe(0);
      });
    });

    describe('linear strategy', () => {
      it('should calculate linear backoff correctly', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 5,
          strategy: 'linear',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          jitterMs: 0, // No jitter for predictable tests
          enabled: true
        }).value;
        
        // Act & Assert
        expect(policy.calculateDelay(1)).toBe(1000);  // 1000 * 1
        expect(policy.calculateDelay(2)).toBe(2000);  // 1000 * 2
        expect(policy.calculateDelay(3)).toBe(3000);  // 1000 * 3
        expect(policy.calculateDelay(4)).toBe(4000);  // 1000 * 4
        expect(policy.calculateDelay(5)).toBe(5000);  // 1000 * 5
      });

      it('should cap linear delay at max delay', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 10,
          strategy: 'linear',
          baseDelayMs: 1000,
          maxDelayMs: 3500, // Cap at 3.5 seconds
          jitterMs: 0,
          enabled: true
        }).value;
        
        // Act & Assert
        expect(policy.calculateDelay(1)).toBe(1000);
        expect(policy.calculateDelay(2)).toBe(2000);
        expect(policy.calculateDelay(3)).toBe(3000);
        expect(policy.calculateDelay(4)).toBe(3500); // Capped
        expect(policy.calculateDelay(5)).toBe(3500); // Still capped
      });
    });

    describe('exponential strategy', () => {
      it('should calculate exponential backoff correctly', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 5,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          multiplier: 2.0,
          jitterMs: 0,
          enabled: true
        }).value;
        
        // Act & Assert
        expect(policy.calculateDelay(1)).toBe(1000);  // 1000 * 2^0
        expect(policy.calculateDelay(2)).toBe(2000);  // 1000 * 2^1
        expect(policy.calculateDelay(3)).toBe(4000);  // 1000 * 2^2
        expect(policy.calculateDelay(4)).toBe(8000);  // 1000 * 2^3
        expect(policy.calculateDelay(5)).toBe(16000); // 1000 * 2^4
      });

      it('should handle custom multiplier', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 4,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          multiplier: 1.5,
          jitterMs: 0,
          enabled: true
        }).value;
        
        // Act & Assert
        expect(policy.calculateDelay(1)).toBe(1000);
        expect(policy.calculateDelay(2)).toBe(1500);  // 1000 * 1.5^1
        expect(policy.calculateDelay(3)).toBe(2250);  // 1000 * 1.5^2
        expect(policy.calculateDelay(4)).toBe(3375);  // 1000 * 1.5^3
      });

      it('should cap exponential delay at max delay', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 10,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 5000,
          multiplier: 2.0,
          jitterMs: 0,
          enabled: true
        }).value;
        
        // Act & Assert
        expect(policy.calculateDelay(1)).toBe(1000);
        expect(policy.calculateDelay(2)).toBe(2000);
        expect(policy.calculateDelay(3)).toBe(4000);
        expect(policy.calculateDelay(4)).toBe(5000); // Capped
        expect(policy.calculateDelay(5)).toBe(5000); // Still capped
      });
    });

    describe('jitter behavior', () => {
      it('should add jitter to calculated delay', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 3,
          strategy: 'linear',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          jitterMs: 500,
          enabled: true
        }).value;
        
        // Act - Calculate multiple delays to test jitter range
        const delays = Array.from({ length: 100 }, () => policy.calculateDelay(1));
        
        // Assert - All delays should be within jitter range
        delays.forEach(delay => {
          expect(delay).toBeGreaterThanOrEqual(1000);
          expect(delay).toBeLessThanOrEqual(1500);
        });
      });

      it('should not exceed max delay even with jitter', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 5,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 2000,
          multiplier: 2.0,
          jitterMs: 1000, // Large jitter
          enabled: true
        }).value;
        
        // Act - Calculate delays that would exceed max without capping
        const delays = Array.from({ length: 50 }, () => policy.calculateDelay(5));
        
        // Assert - All delays should be <= maxDelayMs
        delays.forEach(delay => {
          expect(delay).toBeLessThanOrEqual(2000);
        });
      });

      it('should handle zero jitter correctly', () => {
        // Arrange
        const policy = RetryPolicy.create({
          maxAttempts: 3,
          strategy: 'linear',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          jitterMs: 0,
          enabled: true
        }).value;
        
        // Act
        const delay1 = policy.calculateDelay(1);
        const delay2 = policy.calculateDelay(1);
        
        // Assert - Should be identical with zero jitter
        expect(delay1).toBe(1000);
        expect(delay2).toBe(1000);
      });
    });
  });

  describe('retry attempt validation', () => {
    it('should validate retry attempts correctly', () => {
      // Arrange
      const policy = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      }).value;
      
      // Act & Assert
      expect(policy.shouldRetry(1)).toBe(true);
      expect(policy.shouldRetry(2)).toBe(true);
      expect(policy.shouldRetry(3)).toBe(true);
      expect(policy.shouldRetry(4)).toBe(false); // Exceeds max attempts
      expect(policy.shouldRetry(5)).toBe(false);
    });

    it('should not retry when disabled', () => {
      // Arrange
      const policy = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: false
      }).value;
      
      // Act & Assert
      expect(policy.shouldRetry(1)).toBe(false);
      expect(policy.shouldRetry(2)).toBe(false);
      expect(policy.shouldRetry(3)).toBe(false);
    });

    it('should handle zero max attempts', () => {
      // Arrange
      const policy = RetryPolicy.create({
        maxAttempts: 0,
        strategy: 'immediate',
        baseDelayMs: 0,
        maxDelayMs: 0,
        enabled: true
      }).value;
      
      // Act & Assert
      expect(policy.shouldRetry(1)).toBe(false);
    });

    it('should handle single attempt', () => {
      // Arrange
      const policy = RetryPolicy.create({
        maxAttempts: 1,
        strategy: 'immediate',
        baseDelayMs: 0,
        maxDelayMs: 0,
        enabled: true
      }).value;
      
      // Act & Assert
      expect(policy.shouldRetry(1)).toBe(true);
      expect(policy.shouldRetry(2)).toBe(false);
    });
  });

  describe('equality and comparison', () => {
    it('should be equal when all properties match', () => {
      // Arrange
      const config: RetryPolicyConfig = {
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        multiplier: 2.0,
        jitterMs: 100,
        enabled: true
      };
      
      const policy1 = RetryPolicy.create(config).value;
      const policy2 = RetryPolicy.create(config).value;
      
      // Act & Assert
      expect(policy1.equals(policy2)).toBe(true);
    });

    it('should not be equal when max attempts differ', () => {
      // Arrange
      const policy1 = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      }).value;
      
      const policy2 = RetryPolicy.create({
        maxAttempts: 5, // Different
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      }).value;
      
      // Act & Assert
      expect(policy1.equals(policy2)).toBe(false);
    });

    it('should not be equal when strategy differs', () => {
      // Arrange
      const policy1 = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      }).value;
      
      const policy2 = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'linear', // Different
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      }).value;
      
      // Act & Assert
      expect(policy1.equals(policy2)).toBe(false);
    });

    it('should not be equal when delays differ', () => {
      // Arrange
      const policy1 = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      }).value;
      
      const policy2 = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 2000, // Different
        maxDelayMs: 30000,
        enabled: true
      }).value;
      
      // Act & Assert
      expect(policy1.equals(policy2)).toBe(false);
    });

    it('should not be equal when enabled state differs', () => {
      // Arrange
      const policy1 = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: true
      }).value;
      
      const policy2 = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        enabled: false // Different
      }).value;
      
      // Act & Assert
      expect(policy1.equals(policy2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to object correctly', () => {
      // Arrange
      const policy = RetryPolicy.create({
        maxAttempts: 5,
        strategy: 'linear',
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        multiplier: 1.5,
        jitterMs: 200,
        enabled: true
      }).value;
      
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

    it('should convert to legacy object correctly', () => {
      // Arrange
      const policy = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        multiplier: 2.0,
        jitterMs: 0,
        enabled: true
      }).value;
      
      // Act
      const obj = policy.toLegacyObject();
      
      // Assert
      expect(obj).toEqual({
        // New format
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        multiplier: 2.0,
        jitterMs: 0,
        enabled: true,
        // Legacy format
        backoffStrategy: 'exponential',
        backoffDelay: 1000,
        failureThreshold: 3
      });
    });

    it('should create from object correctly', () => {
      // Arrange
      const obj: RetryPolicyConfig = {
        maxAttempts: 4,
        strategy: 'linear',
        baseDelayMs: 1500,
        maxDelayMs: 45000,
        multiplier: 1.2,
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

  describe('immutability', () => {
    let policy: RetryPolicy;

    beforeEach(() => {
      policy = RetryPolicy.createDefault().value;
    });

    it('should be immutable after creation', () => {
      // Arrange
      const originalMaxAttempts = policy.maxAttempts;
      const originalStrategy = policy.strategy;
      
      // Act - Try to modify (should have no effect due to readonly and freezing)
      try {
        (policy as any)._maxAttempts = 999;
        (policy as any)._strategy = 'immediate';
      } catch (error) {
        // Expected in strict mode
      }
      
      // Assert - Values should remain unchanged
      expect(policy.maxAttempts).toBe(originalMaxAttempts);
      expect(policy.strategy).toBe(originalStrategy);
    });

    it('should not allow modification of properties', () => {
      // Arrange
      const originalMaxAttempts = policy.maxAttempts;
      
      // Act & Assert
      try {
        (policy as any).maxAttempts = 999;
      } catch (error) {
        // Expected - getters are not settable
      }
      
      expect(policy.maxAttempts).toBe(originalMaxAttempts);
    });
  });

  describe('edge cases', () => {
    it('should handle very large attempt numbers', () => {
      // Arrange
      const policy = RetryPolicy.create({
        maxAttempts: 100,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 300000,
        multiplier: 2.0,
        jitterMs: 0,
        enabled: true
      }).value;
      
      // Act & Assert
      expect(policy.shouldRetry(99)).toBe(true);
      expect(policy.shouldRetry(100)).toBe(true);
      expect(policy.shouldRetry(101)).toBe(false);
    });

    it('should handle strategy edge cases', () => {
      // Test all valid strategies
      const strategies: BackoffStrategy[] = ['immediate', 'linear', 'exponential'];
      
      strategies.forEach(strategy => {
        const policy = RetryPolicy.create({
          maxAttempts: 2,
          strategy,
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          enabled: true
        }).value;
        
        expect(policy.strategy).toBe(strategy);
        expect(policy.calculateDelay(1)).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle floating point precision in calculations', () => {
      // Arrange
      const policy = RetryPolicy.create({
        maxAttempts: 5,
        strategy: 'exponential',
        baseDelayMs: 100,
        maxDelayMs: 30000,
        multiplier: 1.1,
        jitterMs: 0,
        enabled: true
      }).value;
      
      // Act - Test calculations with floating point multiplier
      const delay1 = policy.calculateDelay(1);
      const delay2 = policy.calculateDelay(2);
      const delay3 = policy.calculateDelay(3);
      
      // Assert - Should handle floating point math correctly
      expect(delay1).toBe(100);
      expect(delay2).toBeCloseTo(110, 10);
      expect(delay3).toBeCloseTo(121, 10);
    });

    it('should handle boundary conditions for max delay', () => {
      // Arrange
      const policy = RetryPolicy.create({
        maxAttempts: 5,
        strategy: 'exponential',
        baseDelayMs: 10000,
        maxDelayMs: 10000, // Equal to base delay
        multiplier: 2.0,
        jitterMs: 0,
        enabled: true
      }).value;
      
      // Act & Assert
      expect(policy.calculateDelay(1)).toBe(10000);
      expect(policy.calculateDelay(2)).toBe(10000); // Should be capped
      expect(policy.calculateDelay(3)).toBe(10000); // Should be capped
    });
  });
});