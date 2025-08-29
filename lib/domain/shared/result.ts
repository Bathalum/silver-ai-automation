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

  /**
   * Transforms the value of a successful Result using the provided function.
   * If the Result is a failure, the transformation is not applied and the failure is propagated.
   * 
   * @param fn - The transformation function to apply to the value
   * @returns A new Result with the transformed value, or the original failure
   */
  public map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this._error!);
    }
    
    try {
      const transformedValue = fn(this._value!);
      return Result.ok<U>(transformedValue);
    } catch (error) {
      return Result.fail<U>(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Applies a function that returns a Result to the value of a successful Result.
   * Flattens nested Results to avoid Result<Result<T>>.
   * If the Result is a failure, the function is not applied and the failure is propagated.
   * 
   * @param fn - The function that takes a value and returns a Result
   * @returns The Result returned by the function, or the original failure
   */
  public flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this._error!);
    }
    
    try {
      return fn(this._value!);
    } catch (error) {
      return Result.fail<U>(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Returns the value if the Result is successful, otherwise returns the provided default value.
   * This provides safe access to the value without throwing exceptions.
   * 
   * @param defaultValue - The value to return if the Result is a failure
   * @returns The Result's value or the default value
   */
  public getOrElse(defaultValue: T): T {
    return this.isSuccess ? this._value! : defaultValue;
  }

  /**
   * Pattern matching for Results. Applies the appropriate function based on success/failure state.
   * 
   * @param onSuccess - Function to apply to successful value
   * @param onFailure - Function to apply to error message
   * @returns The result of applying the appropriate function
   */
  public fold<U>(onSuccess: (value: T) => U, onFailure: (error: string) => U): U {
    return this.isSuccess ? onSuccess(this._value!) : onFailure(this._error!);
  }

  /**
   * Recovers from a failure by providing a fallback value.
   * If the Result is successful, returns the original Result unchanged.
   * 
   * @param recoveryFn - Function to generate recovery value
   * @returns New Result with recovery value, or original successful Result
   */
  public recover(recoveryFn: () => T): Result<T> {
    if (this.isSuccess) {
      return this;
    }
    
    try {
      const recoveredValue = recoveryFn();
      return Result.ok(recoveredValue);
    } catch (error) {
      return Result.fail<T>(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Recovers from a failure by providing a fallback Result.
   * If the Result is successful, returns the original Result unchanged.
   * 
   * @param recoveryFn - Function to generate recovery Result
   * @returns Recovery Result, or original successful Result
   */
  public recoverWith(recoveryFn: () => Result<T>): Result<T> {
    if (this.isSuccess) {
      return this;
    }
    
    try {
      return recoveryFn();
    } catch (error) {
      return Result.fail<T>(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Executes a side effect on the value if the Result is successful.
   * Returns the original Result unchanged, allowing for method chaining.
   * 
   * @param sideEffect - Function to execute for side effects
   * @returns The original Result unchanged
   */
  public tap(sideEffect: (value: T) => void): Result<T> {
    if (this.isSuccess) {
      try {
        sideEffect(this._value!);
      } catch {
        // Side effects should not affect the Result state
        // Silently ignore side effect failures
      }
    }
    return this;
  }

  /**
   * Executes a side effect on the error if the Result is a failure.
   * Returns the original Result unchanged, allowing for method chaining.
   * 
   * @param sideEffect - Function to execute for side effects on error
   * @returns The original Result unchanged
   */
  public tapError(sideEffect: (error: string) => void): Result<T> {
    if (this.isFailure) {
      try {
        sideEffect(this._error!);
      } catch {
        // Side effects should not affect the Result state
        // Silently ignore side effect failures
      }
    }
    return this;
  }
}