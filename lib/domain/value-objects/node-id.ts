import { Result } from '../shared/result';

export class NodeId {
  private static readonly UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static testCounter = 1;

  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
    Object.freeze(this);
  }

  public get value(): string {
    return this._value;
  }

  public static create(id: string): Result<NodeId> {
    // Handle non-string inputs
    if (id === null || id === undefined) {
      return Result.fail<NodeId>('Node ID cannot be empty');
    }
    
    // Convert to string if needed (handles objects with toString())
    const idString = typeof id === 'string' ? id : String(id);
    
    if (!idString || idString.trim().length === 0) {
      return Result.fail<NodeId>('Node ID cannot be empty');
    }

    const trimmedId = idString.trim();
    if (!NodeId.UUID_PATTERN.test(trimmedId)) {
      return Result.fail<NodeId>('Node ID must be a valid UUID');
    }

    return Result.ok<NodeId>(new NodeId(trimmedId));
  }

  public static generate(): NodeId {
    // For testing environments, use a counter-based deterministic approach
    if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
      // Fallback for test environments - generate deterministic UUIDs
      const counter = (NodeId.testCounter++).toString().padStart(8, '0');
      const uuid = `${counter}-0000-4000-8000-${counter}0000`;
      return new NodeId(uuid);
    }
    const uuid = crypto.randomUUID();
    return new NodeId(uuid);
  }

  public equals(other: NodeId): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  public toString(): string {
    return this._value;
  }
}