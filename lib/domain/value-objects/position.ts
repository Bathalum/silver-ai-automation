import { Result } from '../shared/result';

export class Position {
  private static readonly MIN_COORDINATE = -10000;
  private static readonly MAX_COORDINATE = 10000;

  private constructor(
    private readonly _x: number,
    private readonly _y: number
  ) {
    // Make the instance immutable at runtime
    Object.freeze(this);
  }

  public get x(): number {
    return this._x;
  }

  public get y(): number {
    return this._y;
  }

  public static create(x: number, y: number): Result<Position> {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return Result.fail<Position>('Position coordinates must be finite numbers');
    }

    if (x < Position.MIN_COORDINATE || x > Position.MAX_COORDINATE) {
      return Result.fail<Position>(`X coordinate must be between ${Position.MIN_COORDINATE} and ${Position.MAX_COORDINATE}`);
    }

    if (y < Position.MIN_COORDINATE || y > Position.MAX_COORDINATE) {
      return Result.fail<Position>(`Y coordinate must be between ${Position.MIN_COORDINATE} and ${Position.MAX_COORDINATE}`);
    }

    return Result.ok<Position>(new Position(x, y));
  }

  public static zero(): Position {
    return new Position(0, 0);
  }

  public moveTo(x: number, y: number): Result<Position> {
    return Position.create(x, y);
  }

  public moveBy(deltaX: number, deltaY: number): Result<Position> {
    return Position.create(this._x + deltaX, this._y + deltaY);
  }

  public distanceTo(other: Position): number {
    const deltaX = this._x - other._x;
    const deltaY = this._y - other._y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  public equals(other: Position): boolean {
    return this._x === other._x && this._y === other._y;
  }

  public toString(): string {
    return `(${this._x}, ${this._y})`;
  }

  public toObject(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }
}