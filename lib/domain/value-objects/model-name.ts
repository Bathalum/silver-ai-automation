import { Result } from '../shared/result';

export class ModelName {
  private static readonly MIN_LENGTH = 3;
  private static readonly MAX_LENGTH = 100;
  private static readonly VALID_PATTERN = /^[a-zA-Z0-9\s\-_]+$/;

  private constructor(private readonly _value: string) {}

  public get value(): string {
    return this._value;
  }

  public static create(name: string): Result<ModelName> {
    if (!name || name.trim().length === 0) {
      return Result.fail<ModelName>('Model name cannot be empty');
    }

    const trimmedName = name.trim();

    if (trimmedName.length < ModelName.MIN_LENGTH) {
      return Result.fail<ModelName>(`Model name must be at least ${ModelName.MIN_LENGTH} characters long`);
    }

    if (trimmedName.length > ModelName.MAX_LENGTH) {
      return Result.fail<ModelName>(`Model name cannot exceed ${ModelName.MAX_LENGTH} characters`);
    }

    if (!ModelName.VALID_PATTERN.test(trimmedName)) {
      return Result.fail<ModelName>('Model name can only contain letters, numbers, spaces, hyphens, and underscores');
    }

    return Result.ok<ModelName>(new ModelName(trimmedName));
  }

  public equals(other: ModelName): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}