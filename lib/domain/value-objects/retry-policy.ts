import { Result } from '../shared/result';

export type BackoffStrategy = 'immediate' | 'linear' | 'exponential';

export class RetryPolicy {
  private static readonly MIN_ATTEMPTS = 1;
  private static readonly MAX_ATTEMPTS = 10;
  private static readonly MIN_DELAY = 0;
  private static readonly MAX_DELAY = 300; // 5 minutes

  private constructor(
    private readonly _maxAttempts: number,
    private readonly _backoffStrategy: BackoffStrategy,
    private readonly _backoffDelay: number,
    private readonly _failureThreshold: number
  ) {}

  public get maxAttempts(): number {
    return this._maxAttempts;
  }

  public get backoffStrategy(): BackoffStrategy {
    return this._backoffStrategy;
  }

  public get backoffDelay(): number {
    return this._backoffDelay;
  }

  public get failureThreshold(): number {
    return this._failureThreshold;
  }

  public static create(
    maxAttempts: number,
    backoffStrategy: BackoffStrategy,
    backoffDelay: number,
    failureThreshold: number
  ): Result<RetryPolicy> {
    if (maxAttempts < RetryPolicy.MIN_ATTEMPTS || maxAttempts > RetryPolicy.MAX_ATTEMPTS) {
      return Result.fail<RetryPolicy>(`Max attempts must be between ${RetryPolicy.MIN_ATTEMPTS} and ${RetryPolicy.MAX_ATTEMPTS}`);
    }

    if (backoffDelay < RetryPolicy.MIN_DELAY || backoffDelay > RetryPolicy.MAX_DELAY) {
      return Result.fail<RetryPolicy>(`Backoff delay must be between ${RetryPolicy.MIN_DELAY} and ${RetryPolicy.MAX_DELAY} seconds`);
    }

    if (failureThreshold < 1 || failureThreshold > maxAttempts) {
      return Result.fail<RetryPolicy>('Failure threshold must be between 1 and max attempts');
    }

    const validStrategies: BackoffStrategy[] = ['immediate', 'linear', 'exponential'];
    if (!validStrategies.includes(backoffStrategy)) {
      return Result.fail<RetryPolicy>('Backoff strategy must be immediate, linear, or exponential');
    }

    return Result.ok<RetryPolicy>(new RetryPolicy(maxAttempts, backoffStrategy, backoffDelay, failureThreshold));
  }

  public static default(): RetryPolicy {
    return new RetryPolicy(3, 'exponential', 5, 3);
  }

  public static noRetry(): RetryPolicy {
    return new RetryPolicy(1, 'immediate', 0, 1);
  }

  public calculateDelay(attempt: number): number {
    if (this._backoffStrategy === 'immediate') {
      return 0;
    }

    if (this._backoffStrategy === 'linear') {
      return this._backoffDelay * attempt;
    }

    if (this._backoffStrategy === 'exponential') {
      return this._backoffDelay * Math.pow(2, attempt - 1);
    }

    return this._backoffDelay;
  }

  public shouldRetry(attempt: number, failureCount: number): boolean {
    return attempt < this._maxAttempts && failureCount < this._failureThreshold;
  }

  public equals(other: RetryPolicy): boolean {
    return (
      this._maxAttempts === other._maxAttempts &&
      this._backoffStrategy === other._backoffStrategy &&
      this._backoffDelay === other._backoffDelay &&
      this._failureThreshold === other._failureThreshold
    );
  }

  public toObject(): {
    maxAttempts: number;
    backoffStrategy: BackoffStrategy;
    backoffDelay: number;
    failureThreshold: number;
  } {
    return {
      maxAttempts: this._maxAttempts,
      backoffStrategy: this._backoffStrategy,
      backoffDelay: this._backoffDelay,
      failureThreshold: this._failureThreshold,
    };
  }
}