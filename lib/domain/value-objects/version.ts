import { Result } from '../shared/result';

export class Version {
  private static readonly VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*))?$/;

  private readonly _major: number;
  private readonly _minor: number;
  private readonly _patch: number;
  private readonly _prerelease?: string;

  private constructor(major: number, minor: number, patch: number, prerelease?: string) {
    // Use Object.defineProperty to make properties truly immutable
    Object.defineProperty(this, '_major', {
      value: major,
      writable: false,
      enumerable: false,
      configurable: false
    });
    Object.defineProperty(this, '_minor', {
      value: minor,
      writable: false,
      enumerable: false,
      configurable: false
    });
    Object.defineProperty(this, '_patch', {
      value: patch,
      writable: false,
      enumerable: false,
      configurable: false
    });
    if (prerelease !== undefined) {
      Object.defineProperty(this, '_prerelease', {
        value: prerelease,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
    
    // Freeze the object to prevent any modifications
    Object.freeze(this);
  }

  public get major(): number {
    return this._major;
  }

  public get minor(): number {
    return this._minor;
  }

  public get patch(): number {
    return this._patch;
  }

  public get prerelease(): string | undefined {
    return this._prerelease;
  }

  public get value(): string {
    const base = `${this._major}.${this._minor}.${this._patch}`;
    return this._prerelease ? `${base}-${this._prerelease}` : base;
  }

  public static create(version: string): Result<Version> {
    if (!version || version.trim().length === 0) {
      return Result.fail<Version>('Version cannot be empty');
    }

    const match = version.trim().match(Version.VERSION_PATTERN);
    if (!match) {
      return Result.fail<Version>('Version must follow semantic versioning format (e.g., 1.0.0 or 1.0.0-beta)');
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);
    const prerelease = match[4];

    return Result.ok<Version>(new Version(major, minor, patch, prerelease));
  }

  public static initial(): Version {
    return new Version(1, 0, 0);
  }

  public incrementMajor(): Version {
    return new Version(this._major + 1, 0, 0);
  }

  public incrementMinor(): Version {
    return new Version(this._major, this._minor + 1, 0);
  }

  public incrementPatch(): Version {
    return new Version(this._major, this._minor, this._patch + 1);
  }

  public compare(other: Version): number {
    // Type guard to ensure other is a Version instance
    if (!other || typeof other !== 'object' || !(other instanceof Version)) {
      throw new Error('Cannot compare with non-Version object');
    }
    
    if (this._major !== other._major) {
      return this._major - other._major;
    }
    if (this._minor !== other._minor) {
      return this._minor - other._minor;
    }
    if (this._patch !== other._patch) {
      return this._patch - other._patch;
    }

    // Handle prerelease comparison
    if (!this._prerelease && !other._prerelease) {
      return 0;
    }
    if (!this._prerelease && other._prerelease) {
      return 1; // Release version is greater than prerelease
    }
    if (this._prerelease && !other._prerelease) {
      return -1; // Prerelease version is less than release
    }

    return this._prerelease!.localeCompare(other._prerelease!);
  }

  public equals(other: Version): boolean {
    // Type guard to ensure other is a Version instance with required methods
    if (!other || typeof other !== 'object') {
      return false;
    }
    
    // Check if other is actually a Version instance
    if (!(other instanceof Version)) {
      return false;
    }
    
    // Additional check to ensure other has the compare method
    if (typeof other.compare !== 'function') {
      return false;
    }
    
    return this.compare(other) === 0;
  }

  public isGreaterThan(other: Version): boolean {
    // Type guard - if other is invalid, consider this as not greater
    if (!other || typeof other !== 'object' || !(other instanceof Version)) {
      return false;
    }
    return this.compare(other) > 0;
  }

  public isLessThan(other: Version): boolean {
    // Type guard - if other is invalid, consider this as not less
    if (!other || typeof other !== 'object' || !(other instanceof Version)) {
      return false;
    }
    return this.compare(other) < 0;
  }

  public toString(): string {
    return this.value;
  }
}