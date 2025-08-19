/**
 * Unit tests for Version value object
 * Tests semantic versioning business rules and operations
 */

import { Version } from '@/lib/domain/value-objects/version';
import { ResultTestHelpers, ValidationHelpers } from '../../../utils/test-helpers';

describe('Version', () => {
  describe('creation', () => {
    it('should create valid semantic version', () => {
      // Arrange
      const validVersion = '1.0.0';
      
      // Act
      const result = Version.create(validVersion);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.toString()).toBe(validVersion);
    });

    it('should create version with patch numbers', () => {
      // Arrange
      const patchVersion = '2.1.5';
      
      // Act
      const result = Version.create(patchVersion);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.major).toBe(2);
      expect(result.value.minor).toBe(1);
      expect(result.value.patch).toBe(5);
    });

    it('should create version with zero components', () => {
      // Arrange
      const zeroVersion = '0.0.1';
      
      // Act
      const result = Version.create(zeroVersion);
      
      // Assert
      expect(result).toBeValidResult();
    });

    it('should handle large version numbers', () => {
      // Arrange
      const largeVersion = '999.999.999';
      
      // Act
      const result = Version.create(largeVersion);
      
      // Assert
      expect(result).toBeValidResult();
    });
  });

  describe('validation failures', () => {
    it('should reject empty version string', () => {
      // Act
      const result = Version.create('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Version cannot be empty');
    });

    it('should reject invalid semantic version format', () => {
      // Arrange
      const invalidVersions = [
        '1.0',        // Missing patch
        '1',          // Missing minor and patch
        '1.0.0.0',    // Too many components
        'v1.0.0',     // With 'v' prefix
        '1.0.0-beta', // With pre-release (not supported in basic version)
        '1.0.0+build' // With build metadata
      ];
      
      // Act & Assert
      invalidVersions.forEach(version => {
        const result = Version.create(version);
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Invalid semantic version format. Expected: MAJOR.MINOR.PATCH');
      });
    });

    it('should reject non-numeric version components', () => {
      // Arrange
      const invalidVersions = [
        'a.0.0',
        '1.b.0',
        '1.0.c',
        'one.two.three'
      ];
      
      // Act & Assert
      invalidVersions.forEach(version => {
        const result = Version.create(version);
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version components must be non-negative integers');
      });
    });

    it('should reject negative version numbers', () => {
      // Arrange
      const negativeVersions = [
        '-1.0.0',
        '1.-1.0',
        '1.0.-1'
      ];
      
      // Act & Assert
      negativeVersions.forEach(version => {
        const result = Version.create(version);
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version components must be non-negative integers');
      });
    });

    it('should reject versions with leading zeros', () => {
      // Arrange
      const leadingZeroVersions = [
        '01.0.0',
        '1.01.0',
        '1.0.01'
      ];
      
      // Act & Assert
      leadingZeroVersions.forEach(version => {
        const result = Version.create(version);
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version components cannot have leading zeros');
      });
    });
  });

  describe('version comparison', () => {
    it('should compare major versions correctly', () => {
      // Arrange
      const version1 = ResultTestHelpers.expectSuccess(Version.create('2.0.0'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.9.9'));
      
      // Act & Assert
      expect(version1.isGreaterThan(version2)).toBe(true);
      expect(version2.isLessThan(version1)).toBe(true);
      expect(version1.equals(version2)).toBe(false);
    });

    it('should compare minor versions correctly', () => {
      // Arrange
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.2.0'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.1.9'));
      
      // Act & Assert
      expect(version1.isGreaterThan(version2)).toBe(true);
      expect(version2.isLessThan(version1)).toBe(true);
    });

    it('should compare patch versions correctly', () => {
      // Arrange
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.0.2'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.0.1'));
      
      // Act & Assert
      expect(version1.isGreaterThan(version2)).toBe(true);
      expect(version2.isLessThan(version1)).toBe(true);
    });

    it('should identify equal versions', () => {
      // Arrange
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      
      // Act & Assert
      expect(version1.equals(version2)).toBe(true);
      expect(version1.isGreaterThan(version2)).toBe(false);
      expect(version1.isLessThan(version2)).toBe(false);
    });

    it('should handle complex version comparisons', () => {
      // Arrange & Act & Assert
      const versions = [
        '0.0.1',
        '0.1.0', 
        '0.1.1',
        '1.0.0',
        '1.0.1',
        '1.1.0',
        '2.0.0'
      ].map(v => ResultTestHelpers.expectSuccess(Version.create(v)));

      // Test that each version is less than all subsequent versions
      for (let i = 0; i < versions.length - 1; i++) {
        for (let j = i + 1; j < versions.length; j++) {
          expect(versions[i].isLessThan(versions[j])).toBe(true);
          expect(versions[j].isGreaterThan(versions[i])).toBe(true);
        }
      }
    });
  });

  describe('version increments', () => {
    it('should increment patch version correctly', () => {
      // Arrange
      const version = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      
      // Act
      const result = version.incrementPatch();
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.toString()).toBe('1.2.4');
    });

    it('should increment minor version and reset patch', () => {
      // Arrange
      const version = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      
      // Act
      const result = version.incrementMinor();
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.toString()).toBe('1.3.0');
    });

    it('should increment major version and reset minor and patch', () => {
      // Arrange
      const version = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      
      // Act
      const result = version.incrementMajor();
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.toString()).toBe('2.0.0');
    });

    it('should handle maximum version numbers for increments', () => {
      // Arrange
      const maxVersion = ResultTestHelpers.expectSuccess(Version.create('999.999.999'));
      
      // Act
      const patchResult = maxVersion.incrementPatch();
      const minorResult = maxVersion.incrementMinor();
      const majorResult = maxVersion.incrementMajor();
      
      // Assert - should handle overflow appropriately
      expect(patchResult).toBeFailureResult();
      expect(minorResult).toBeFailureResult();
      expect(majorResult).toBeFailureResult();
      expect(patchResult).toHaveErrorMessage('Version number overflow');
    });
  });

  describe('version compatibility', () => {
    it('should determine semantic compatibility correctly', () => {
      // Arrange
      const baseVersion = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      
      // Act & Assert
      // Patch updates are compatible
      const patchUpdate = ResultTestHelpers.expectSuccess(Version.create('1.2.4'));
      expect(baseVersion.isCompatibleWith(patchUpdate)).toBe(true);
      
      // Minor updates are compatible
      const minorUpdate = ResultTestHelpers.expectSuccess(Version.create('1.3.0'));
      expect(baseVersion.isCompatibleWith(minorUpdate)).toBe(true);
      
      // Major updates are not compatible
      const majorUpdate = ResultTestHelpers.expectSuccess(Version.create('2.0.0'));
      expect(baseVersion.isCompatibleWith(majorUpdate)).toBe(false);
    });

    it('should handle breaking change detection', () => {
      // Arrange
      const version1 = ResultTestHelpers.expectSuccess(Version.create('1.5.2'));
      const version2 = ResultTestHelpers.expectSuccess(Version.create('2.0.0'));
      
      // Act & Assert
      expect(version1.hasBreakingChanges(version2)).toBe(true);
      expect(version2.hasBreakingChanges(version1)).toBe(false); // Downgrade scenario
    });
  });

  describe('version validation rules', () => {
    it('should enforce business version increment rules', () => {
      // Arrange
      const currentVersion = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      
      // Valid next versions
      const validNextVersions = ['1.2.4', '1.3.0', '2.0.0'];
      
      // Invalid next versions (gaps not allowed)
      const invalidNextVersions = ['1.2.5', '1.4.0', '3.0.0', '1.1.0'];
      
      // Act & Assert
      validNextVersions.forEach(versionString => {
        const nextVersion = ResultTestHelpers.expectSuccess(Version.create(versionString));
        expect(currentVersion.canUpgradeTo(nextVersion)).toBe(true);
      });
      
      invalidNextVersions.forEach(versionString => {
        const nextVersion = ResultTestHelpers.expectSuccess(Version.create(versionString));
        expect(currentVersion.canUpgradeTo(nextVersion)).toBe(false);
      });
    });
  });

  describe('toString and serialization', () => {
    it('should convert to string correctly', () => {
      // Arrange
      const version = ResultTestHelpers.expectSuccess(Version.create('1.2.3'));
      
      // Act
      const result = version.toString();
      
      // Assert
      expect(result).toBe('1.2.3');
    });

    it('should provide component access', () => {
      // Arrange
      const version = ResultTestHelpers.expectSuccess(Version.create('5.10.15'));
      
      // Act & Assert
      expect(version.major).toBe(5);
      expect(version.minor).toBe(10);
      expect(version.patch).toBe(15);
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle whitespace in version strings', () => {
      // Arrange
      const versionsWithWhitespace = [
        ' 1.0.0',
        '1.0.0 ',
        ' 1.0.0 ',
        '1. 0.0',
        '1.0. 0'
      ];
      
      // Act & Assert
      versionsWithWhitespace.forEach(version => {
        const result = Version.create(version);
        expect(result).toBeFailureResult();
      });
    });

    it('should handle extremely large numbers', () => {
      // Arrange
      const extremeVersion = '999999999.999999999.999999999';
      
      // Act
      const result = Version.create(extremeVersion);
      
      // Assert - Should either succeed or fail gracefully
      if (result.isSuccess) {
        expect(result.value.major).toBe(999999999);
      } else {
        expect(result).toHaveErrorMessage('Version number too large');
      }
    });
  });
});