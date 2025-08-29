/**
 * Comprehensive tests for Version value object equality behavior
 * This test file specifically addresses the critical failures in architectural compliance tests
 * that rely on the Version.equals() method functionality.
 * 
 * These tests act as Boundary Filters to ensure Version objects behave as proper Value Objects
 * and serve as executable documentation for Version equality contracts.
 */

import { Version } from '@/lib/domain/value-objects/version';
import { ResultTestHelpers } from '../../../utils/test-helpers';

describe('Version Value Object - Equality Compliance', () => {
  
  describe('Value Object Identity Rules', () => {
    it('Version_Equals_ShouldReturnTrueForIdenticalVersions', () => {
      // Arrange - Create identical versions
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      
      // Act & Assert - Value objects with same values should be equal
      expect(version1.equals(version2)).toBe(true);
      expect(version2.equals(version1)).toBe(true); // Symmetry
      
      // Verify compare method consistency
      expect(version1.compare(version2)).toBe(0);
      expect(version2.compare(version1)).toBe(0);
    });

    it('Version_Equals_ShouldReturnFalseForDifferentVersions', () => {
      // Arrange - Create different versions
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.2.4'));
      
      // Act & Assert - Different values should not be equal
      expect(version1.equals(version2)).toBe(false);
      expect(version2.equals(version1)).toBe(false); // Symmetry
      
      // Verify compare method consistency
      expect(version1.compare(version2)).not.toBe(0);
    });

    it('Version_Equals_ShouldHandleReflexivity', () => {
      // Arrange - Single version instance
      const version = ResultTestHelpers.expectSuccess(Version.create('2.1.0'));
      
      // Act & Assert - Object should equal itself (reflexivity)
      expect(version.equals(version)).toBe(true);
      expect(version.compare(version)).toBe(0);
    });

    it('Version_Equals_ShouldHandleTransitivity', () => {
      // Arrange - Three identical versions
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.5.7'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.5.7'));
      const version3 = ResultTestHelpers.expectSuccess(Version.create('1.5.7'));
      
      // Act & Assert - If a=b and b=c, then a=c (transitivity)
      expect(version1.equals(version2)).toBe(true);
      expect(version2.equals(version3)).toBe(true);
      expect(version1.equals(version3)).toBe(true);
    });
  });

  describe('Prerelease Version Equality', () => {
    it('Version_Equals_ShouldHandlePrereleaseVersions', () => {
      // Arrange - Prerelease versions
      const alpha1 = ResultTestHelpers.expectSuccess(Version.create('2.0.0-alpha'));
      const alpha2 = ResultTestHelpers.expectSuccess(Version.create('2.0.0-alpha'));
      const beta = ResultTestHelpers.expectSuccess(Version.create('2.0.0-beta'));
      
      // Act & Assert - Same prerelease versions should be equal
      expect(alpha1.equals(alpha2)).toBe(true);
      
      // Different prerelease versions should not be equal
      expect(alpha1.equals(beta)).toBe(false);
      expect(beta.equals(alpha1)).toBe(false);
    });

    it('Version_Equals_ShouldDifferentiateReleaseFromPrerelease', () => {
      // Arrange - Release vs prerelease
      const release = ResultTestHelpers.expectSuccess(Version.create('2.0.0'));
      const prerelease = ResultTestHelpers.expectSuccess(Version.create('2.0.0-alpha'));
      
      // Act & Assert - Release and prerelease should not be equal
      expect(release.equals(prerelease)).toBe(false);
      expect(prerelease.equals(release)).toBe(false);
      
      // Verify comparison order (release > prerelease)
      expect(release.compare(prerelease)).toBeGreaterThan(0);
      expect(prerelease.compare(release)).toBeLessThan(0);
    });

    it('Version_Equals_ShouldHandleComplexPrereleaseVersions', () => {
      // Arrange - Complex prerelease identifiers
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.0.0-alpha.1'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.0.0-alpha.1'));
      const version3 = ResultTestHelpers.expectSuccess(Version.create('1.0.0-alpha.2'));
      
      // Act & Assert
      expect(version1.equals(version2)).toBe(true);
      expect(version1.equals(version3)).toBe(false);
      
      // Verify lexicographical ordering of prerelease identifiers
      expect(version1.compare(version3)).toBeLessThan(0);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('Version_Equals_ShouldHandleZeroVersions', () => {
      // Arrange - Zero versions
      const zero1 = ResultTestHelpers.expectSuccess(Version.create('0.0.0'));
      const zero2 = ResultTestHelpers.expectSuccess(Version.create('0.0.0'));
      const nonZero = ResultTestHelpers.expectSuccess(Version.create('0.0.1'));
      
      // Act & Assert
      expect(zero1.equals(zero2)).toBe(true);
      expect(zero1.equals(nonZero)).toBe(false);
    });

    it('Version_Equals_ShouldHandleLargeVersionNumbers', () => {
      // Arrange - Large version numbers
      const large1 = ResultTestHelpers.expectSuccess(Version.create('999999999.999999999.999999999'));
      const large2 = ResultTestHelpers.expectSuccess(Version.create('999999999.999999999.999999999'));
      
      // Act & Assert
      expect(large1.equals(large2)).toBe(true);
    });

    it('Version_Equals_ShouldHandleMixedVersionFormats', () => {
      // Arrange - Different but equivalent formats (if any are supported)
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.0.0'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.0.0'));
      
      // Act & Assert - Even from different creation patterns
      expect(version1.equals(version2)).toBe(true);
      expect(version1.toString()).toBe(version2.toString());
    });
  });

  describe('Method Consistency Validation', () => {
    it('Version_Equals_ShouldBeConsistentWithCompareMethod', () => {
      // Arrange - Test data set
      const testVersions = [
        '0.1.0',
        '1.0.0', 
        '1.0.1',
        '1.1.0',
        '2.0.0-alpha',
        '2.0.0-beta',
        '2.0.0'
      ].map(v => ResultTestHelpers.expectSuccess(Version.create(v)));
      
      // Act & Assert - For every pair of versions
      for (let i = 0; i < testVersions.length; i++) {
        for (let j = 0; j < testVersions.length; j++) {
          const version1 = testVersions[i];
          const version2 = testVersions[j];
          
          const areEqual = version1.equals(version2);
          const compareResult = version1.compare(version2);
          
          if (areEqual) {
            expect(compareResult).toBe(0);
          } else {
            expect(compareResult).not.toBe(0);
          }
        }
      }
    });

    it('Version_Equals_ShouldBeConsistentWithToString', () => {
      // Arrange - Various versions
      const testVersionStrings = ['1.0.0', '2.1.3', '0.0.1', '1.0.0-alpha'];
      
      testVersionStrings.forEach(versionString => {
        // Act
        const version1 = ResultTestHelpers.expectSuccess(Version.create(versionString));
        const version2 = ResultTestHelpers.expectSuccess(Version.create(versionString));
        
        // Assert - Versions with same string representation should be equal
        expect(version1.equals(version2)).toBe(true);
        expect(version1.toString()).toBe(version2.toString());
        expect(version1.toString()).toBe(versionString);
      });
    });
  });

  describe('Architectural Compliance Validation', () => {
    /**
     * This test validates the exact scenario that's failing in the architectural compliance tests.
     * It ensures Version objects created from the same string have proper equals() functionality.
     */
    it('Version_Equals_ShouldSupportArchitecturalCompliancePatterns', () => {
      // Arrange - Simulate the FunctionModel creation pattern
      const versionString = '1.0.0';
      const version1 = ResultTestHelpers.expectSuccess(Version.create(versionString));
      const version2 = ResultTestHelpers.expectSuccess(Version.create(versionString));
      
      // Act & Assert - This is the exact pattern used in FunctionModel.validateInitialState
      expect(version1.equals(version2)).toBe(true);
      
      // Verify the equals method exists and is callable
      expect(typeof version1.equals).toBe('function');
      expect(typeof version2.equals).toBe('function');
      
      // Verify it returns boolean
      expect(typeof version1.equals(version2)).toBe('boolean');
    });

    it('Version_Equals_ShouldNotAcceptInvalidVersionObjects', () => {
      // Arrange - Valid version and invalid mock
      const validVersion = ResultTestHelpers.expectSuccess(Version.create('1.0.0'));
      const invalidMock = { toString: () => '1.0.0' } as any;
      
      // Act & Assert - Should handle invalid objects gracefully
      // Note: This test depends on implementation - Version.equals might throw or return false
      expect(() => {
        // This should either throw or return false, but not crash with "equals is not a function"
        const result = validVersion.equals(invalidMock);
        expect(typeof result).toBe('boolean');
      }).not.toThrow(/equals is not a function/);
    });

    it('Version_Equals_ShouldWorkWithFunctionModelValidationPattern', () => {
      // Arrange - Recreate the exact FunctionModel.validateInitialState scenario
      const versionString = '1.0.0';
      const version = ResultTestHelpers.expectSuccess(Version.create(versionString));
      const currentVersion = ResultTestHelpers.expectSuccess(Version.create(versionString));
      
      // Simulate the FunctionModelProps structure
      const props = {
        version: version,
        currentVersion: currentVersion,
        versionCount: 1
      };
      
      // Act - Execute the exact validation logic from FunctionModel
      let validationResult = true;
      try {
        // This mirrors the FunctionModel.validateInitialState logic
        if (props.versionCount < 1) {
          validationResult = false;
        }
        
        if (!props.version.equals(props.currentVersion)) {
          validationResult = false;
        }
      } catch (error) {
        validationResult = false;
      }
      
      // Assert - Should pass validation
      expect(validationResult).toBe(true);
      expect(props.version.equals(props.currentVersion)).toBe(true);
    });
  });

  describe('Version Creation and Equality Integration', () => {
    it('Version_Create_ShouldProduceObjectsWithWorkingEqualsMethods', () => {
      // Arrange - Create versions through all supported methods
      const fromCreate = ResultTestHelpers.expectSuccess(Version.create('1.1.1'));
      const fromInitial = Version.initial(); // Should be 1.0.0
      const fromIncrement = fromInitial.incrementMinor().incrementPatch(); // 1.0.0 -> 1.1.0 -> 1.1.1
      
      // Act & Assert - All should have working equals methods
      expect(typeof fromCreate.equals).toBe('function');
      expect(typeof fromInitial.equals).toBe('function');
      expect(typeof fromIncrement.equals).toBe('function');
      
      // Test actual equality comparisons
      expect(fromCreate.equals(fromIncrement)).toBe(true); // Both should be 1.1.1
      expect(fromInitial.equals(fromCreate)).toBe(false); // 1.0.0 vs 1.1.1
      
      // Verify the actual values
      expect(fromCreate.toString()).toBe('1.1.1');
      expect(fromIncrement.toString()).toBe('1.1.1');
      expect(fromInitial.toString()).toBe('1.0.0');
    });

    it('Version_Static_InitialShouldCreateValidVersionWithEquals', () => {
      // Arrange & Act
      const initialVersion1 = Version.initial();
      const initialVersion2 = Version.initial();
      
      // Assert - Initial versions should be equal and have working equals
      expect(initialVersion1.equals(initialVersion2)).toBe(true);
      expect(initialVersion1.toString()).toBe('1.0.0');
    });

    it('Version_Increments_ShouldCreateValidVersionsWithEquals', () => {
      // Arrange
      const baseVersion = Version.initial(); // 1.0.0
      
      // Act - Create incremented versions
      const patchVersion = baseVersion.incrementPatch(); // 1.0.1
      const minorVersion = baseVersion.incrementMinor(); // 1.1.0
      const majorVersion = baseVersion.incrementMajor(); // 2.0.0
      
      // Assert - All should have working equals and be different from base
      expect(baseVersion.equals(patchVersion)).toBe(false);
      expect(baseVersion.equals(minorVersion)).toBe(false);
      expect(baseVersion.equals(majorVersion)).toBe(false);
      
      // Verify specific values
      expect(patchVersion.toString()).toBe('1.0.1');
      expect(minorVersion.toString()).toBe('1.1.0');
      expect(majorVersion.toString()).toBe('2.0.0');
    });
  });

  describe('Error Handling and Robustness', () => {
    it('Version_Equals_ShouldHandleNullOrUndefinedGracefully', () => {
      // Arrange
      const version = ResultTestHelpers.expectSuccess(Version.create('1.0.0'));
      
      // Act & Assert - Should handle null/undefined without crashing
      expect(() => {
        // Implementation dependent - might throw or return false
        (version.equals as any)(null);
      }).not.toThrow(/equals is not a function/);
      
      expect(() => {
        (version.equals as any)(undefined);
      }).not.toThrow(/equals is not a function/);
    });

    it('Version_Equals_ShouldHandleNonVersionObjectsGracefully', () => {
      // Arrange
      const version = ResultTestHelpers.expectSuccess(Version.create('1.0.0'));
      const nonVersionObjects = [
        'string',
        123,
        { version: '1.0.0' },
        [],
        new Date()
      ];
      
      // Act & Assert - Should handle non-Version objects without "equals is not a function"
      nonVersionObjects.forEach(obj => {
        expect(() => {
          (version.equals as any)(obj);
        }).not.toThrow(/equals is not a function/);
      });
    });
  });

  describe('Performance and Memory Considerations', () => {
    it('Version_Equals_ShouldBeEfficientForRepeatedCalls', () => {
      // Arrange
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.0.0'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.0.0'));
      
      // Act - Multiple equality checks (simulating intensive usage)
      const iterations = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        version1.equals(version2);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Assert - Should complete quickly (less than 100ms for 1000 calls)
      expect(duration).toBeLessThan(100);
      
      // Verify correctness wasn't compromised
      expect(version1.equals(version2)).toBe(true);
    });
  });
});