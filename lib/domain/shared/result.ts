export class Result<T> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: string
  ) {}

  public get isSuccess(): boolean {
    return this._isSuccess;
  }

  public get isFailure(): boolean {
    return !this._isSuccess;
  }

  public get value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value from failed result');
    }
    return this._value!;
  }

  public get error(): string {
    if (this._isSuccess) {
      throw new Error('Cannot get error from successful result');
    }
    return this._error!;
  }

  public static ok<T>(value: T): Result<T> {
    return new Result<T>(true, value);
  }

  public static fail<T>(error: string): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  public static combine<T>(results: Result<T>[]): Result<T[]> {
    const failedResults = results.filter(result => result.isFailure);
    if (failedResults.length > 0) {
      return Result.fail<T[]>(failedResults.map(r => r.error).join(', '));
    }

    return Result.ok<T[]>(results.map(r => r.value));
  }
}