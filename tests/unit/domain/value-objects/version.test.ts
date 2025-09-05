import { Version } from '@/lib/domain/value-objects/version';
import { Result } from '@/lib/domain/shared/result';

describe('Version Value Object', () => {
  describe('creation and validation', () => {
    describe('valid versions', () => {
      it('should create Version with basic semantic version', () => {
        const result = Version.create('1.0.0');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.major).toBe(1);
        expect(result.value!.minor).toBe(0);
        expect(result.value!.patch).toBe(0);
        expect(result.value!.prerelease).toBeUndefined();
        expect(result.value!.value).toBe('1.0.0');
      });

      it('should create Version with prerelease', () => {
        const result = Version.create('2.1.3-beta.1');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.major).toBe(2);
        expect(result.value!.minor).toBe(1);
        expect(result.value!.patch).toBe(3);
        expect(result.value!.prerelease).toBe('beta.1');
        expect(result.value!.value).toBe('2.1.3-beta.1');
      });

      it('should create Version with complex prerelease', () => {
        const result = Version.create('1.0.0-alpha.1.2.3');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.prerelease).toBe('alpha.1.2.3');
        expect(result.value!.value).toBe('1.0.0-alpha.1.2.3');
      });

      it('should trim whitespace from version', () => {
        const result = Version.create('  2.0.0-rc.1  ');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.value).toBe('2.0.0-rc.1');
      });

      it('should handle large version numbers', () => {
        const result = Version.create('999.999.999');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.major).toBe(999);
        expect(result.value!.minor).toBe(999);
        expect(result.value!.patch).toBe(999);
      });
    });

    describe('invalid versions', () => {
      it('should fail with empty string', () => {
        const result = Version.create('');
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Version cannot be empty');
      });

      it('should fail with null input', () => {
        const result = Version.create(null as any);
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Version cannot be empty');
      });

      it('should fail with only whitespace', () => {
        const result = Version.create('   ');
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Version cannot be empty');
      });

      it('should fail with invalid format', () => {
        const invalidVersions = [
          '1',
          '1.0',
          '1.0.0.0',
          'v1.0.0',
          '1.0.0-',
          '1.0.0-beta.',
          'abc.def.ghi',
          '1.0.0-beta@invalid'
        ];
        
        for (const version of invalidVersions) {
          const result = Version.create(version);
          expect(result.isFailure).toBe(true);
          expect(result.error).toBe('Version must follow semantic versioning format (e.g., 1.0.0 or 1.0.0-beta)');
        }
      });
    });
  });

  describe('factory methods', () => {
    it('should create initial version 1.0.0', () => {
      const version = Version.initial();
      
      expect(version.major).toBe(1);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
      expect(version.prerelease).toBeUndefined();
      expect(version.value).toBe('1.0.0');
    });
  });

  describe('version increments', () => {
    let baseVersion: Version;
    
    beforeEach(() => {
      baseVersion = Version.create('1.2.3').value!;
    });

    it('should increment major version', () => {
      const newVersion = baseVersion.incrementMajor();
      
      expect(newVersion.major).toBe(2);
      expect(newVersion.minor).toBe(0);
      expect(newVersion.patch).toBe(0);
      expect(newVersion.prerelease).toBeUndefined();
      expect(newVersion.value).toBe('2.0.0');
    });

    it('should increment minor version', () => {
      const newVersion = baseVersion.incrementMinor();
      
      expect(newVersion.major).toBe(1);
      expect(newVersion.minor).toBe(3);
      expect(newVersion.patch).toBe(0);
      expect(newVersion.prerelease).toBeUndefined();
      expect(newVersion.value).toBe('1.3.0');
    });

    it('should increment patch version', () => {
      const newVersion = baseVersion.incrementPatch();
      
      expect(newVersion.major).toBe(1);
      expect(newVersion.minor).toBe(2);
      expect(newVersion.patch).toBe(4);
      expect(newVersion.prerelease).toBeUndefined();
      expect(newVersion.value).toBe('1.2.4');
    });

    it('should create new immutable instances on increment', () => {
      const majorVersion = baseVersion.incrementMajor();
      
      // Original should be unchanged
      expect(baseVersion.value).toBe('1.2.3');
      // New version should be different
      expect(majorVersion.value).toBe('2.0.0');
      // They should be different instances
      expect(baseVersion).not.toBe(majorVersion);
    });
  });

  describe('version comparison', () => {
    describe('compare method', () => {
      it('should compare major versions correctly', () => {
        const v1 = Version.create('2.0.0').value!;
        const v2 = Version.create('1.0.0').value!;
        
        expect(v1.compare(v2)).toBeGreaterThan(0);
        expect(v2.compare(v1)).toBeLessThan(0);
      });

      it('should compare minor versions when major is same', () => {
        const v1 = Version.create('1.2.0').value!;
        const v2 = Version.create('1.1.0').value!;
        
        expect(v1.compare(v2)).toBeGreaterThan(0);
        expect(v2.compare(v1)).toBeLessThan(0);
      });

      it('should compare patch versions when major and minor are same', () => {
        const v1 = Version.create('1.1.2').value!;
        const v2 = Version.create('1.1.1').value!;
        
        expect(v1.compare(v2)).toBeGreaterThan(0);
        expect(v2.compare(v1)).toBeLessThan(0);
      });

      it('should return 0 for identical versions', () => {
        const v1 = Version.create('1.2.3').value!;
        const v2 = Version.create('1.2.3').value!;
        
        expect(v1.compare(v2)).toBe(0);
      });

      it('should handle prerelease versions correctly', () => {
        const release = Version.create('1.0.0').value!;
        const prerelease = Version.create('1.0.0-beta').value!;
        
        expect(release.compare(prerelease)).toBeGreaterThan(0);
        expect(prerelease.compare(release)).toBeLessThan(0);
      });

      it('should compare prerelease versions alphabetically', () => {
        const alpha = Version.create('1.0.0-alpha').value!;
        const beta = Version.create('1.0.0-beta').value!;
        
        expect(beta.compare(alpha)).toBeGreaterThan(0);
        expect(alpha.compare(beta)).toBeLessThan(0);
      });

      it('should throw error when comparing with non-Version object', () => {
        const version = Version.create('1.0.0').value!;
        
        expect(() => version.compare(null as any)).toThrow('Cannot compare with non-Version object');
        expect(() => version.compare({} as any)).toThrow('Cannot compare with non-Version object');
        expect(() => version.compare('1.0.0' as any)).toThrow('Cannot compare with non-Version object');
      });
    });

    describe('equals method', () => {
      it('should return true for identical versions', () => {
        const v1 = Version.create('1.2.3').value!;
        const v2 = Version.create('1.2.3').value!;
        
        expect(v1.equals(v2)).toBe(true);
        expect(v2.equals(v1)).toBe(true);
      });

      it('should return false for different versions', () => {
        const v1 = Version.create('1.2.3').value!;
        const v2 = Version.create('1.2.4').value!;
        
        expect(v1.equals(v2)).toBe(false);
        expect(v2.equals(v1)).toBe(false);
      });

      it('should handle prerelease versions in equality', () => {
        const v1 = Version.create('1.0.0-beta').value!;
        const v2 = Version.create('1.0.0-beta').value!;
        const v3 = Version.create('1.0.0').value!;
        
        expect(v1.equals(v2)).toBe(true);
        expect(v1.equals(v3)).toBe(false);
      });

      it('should return false for non-Version objects', () => {
        const version = Version.create('1.0.0').value!;
        
        expect(version.equals(null as any)).toBe(false);
        expect(version.equals({} as any)).toBe(false);
        expect(version.equals('1.0.0' as any)).toBe(false);
      });
    });

    describe('comparison helper methods', () => {
      it('should check if version is greater than another', () => {
        const v1 = Version.create('2.0.0').value!;
        const v2 = Version.create('1.0.0').value!;
        
        expect(v1.isGreaterThan(v2)).toBe(true);
        expect(v2.isGreaterThan(v1)).toBe(false);
      });

      it('should check if version is less than another', () => {
        const v1 = Version.create('1.0.0').value!;
        const v2 = Version.create('2.0.0').value!;
        
        expect(v1.isLessThan(v2)).toBe(true);
        expect(v2.isLessThan(v1)).toBe(false);
      });

      it('should return false for greater than with invalid input', () => {
        const version = Version.create('1.0.0').value!;
        
        expect(version.isGreaterThan(null as any)).toBe(false);
        expect(version.isGreaterThan({} as any)).toBe(false);
      });

      it('should return false for less than with invalid input', () => {
        const version = Version.create('1.0.0').value!;
        
        expect(version.isLessThan(null as any)).toBe(false);
        expect(version.isLessThan({} as any)).toBe(false);
      });
    });
  });

  describe('immutability', () => {
    it('should be immutable after creation', () => {
      const version = Version.create('1.2.3-beta').value!;
      
      // Properties should be readonly and throw when attempting to modify
      expect(() => {
        (version as any).major = 999;
      }).toThrow('Cannot set property major');
      
      // Values should remain unchanged
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
      expect(version.prerelease).toBe('beta');
    });

    it('should be frozen to prevent modifications', () => {
      const version = Version.create('1.0.0').value!;
      
      expect(Object.isFrozen(version)).toBe(true);
    });

    it('should create new instances on modification methods', () => {
      const original = Version.create('1.0.0').value!;
      const incremented = original.incrementPatch();
      
      expect(original).not.toBe(incremented);
      expect(original.value).toBe('1.0.0');
      expect(incremented.value).toBe('1.0.1');
    });
  });

  describe('string representation', () => {
    it('should return correct string for release version', () => {
      const version = Version.create('1.2.3').value!;
      
      expect(version.toString()).toBe('1.2.3');
      expect(version.value).toBe('1.2.3');
    });

    it('should return correct string for prerelease version', () => {
      const version = Version.create('2.0.0-beta.1').value!;
      
      expect(version.toString()).toBe('2.0.0-beta.1');
      expect(version.value).toBe('2.0.0-beta.1');
    });
  });

  describe('business scenarios', () => {
    it('should handle typical version progression', () => {
      const initial = Version.initial();
      expect(initial.value).toBe('1.0.0');
      
      const patch = initial.incrementPatch();
      expect(patch.value).toBe('1.0.1');
      
      const minor = patch.incrementMinor();
      expect(minor.value).toBe('1.1.0');
      
      const major = minor.incrementMajor();
      expect(major.value).toBe('2.0.0');
    });

    it('should properly order versions in typical development cycle', () => {
      const versions = [
        Version.create('1.0.0-alpha').value!,
        Version.create('1.0.0-beta').value!,
        Version.create('1.0.0-rc.1').value!,
        Version.create('1.0.0').value!,
        Version.create('1.0.1').value!,
        Version.create('1.1.0').value!,
        Version.create('2.0.0-alpha').value!
      ];
      
      for (let i = 0; i < versions.length - 1; i++) {
        expect(versions[i].isLessThan(versions[i + 1])).toBe(true);
      }
    });
  });

  describe('Result pattern compliance', () => {
    it('should return Result.ok for valid versions', () => {
      const result = Version.create('1.0.0');
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.value).toBeInstanceOf(Version);
    });

    it('should return Result.fail for invalid versions', () => {
      const result = Version.create('invalid');
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(typeof result.error).toBe('string');
    });
  });
});