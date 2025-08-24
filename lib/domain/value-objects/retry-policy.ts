import { Result } from '../shared/result';

export type BackoffStrategy = 'immediate' | 'linear' | 'exponential';

export interface RetryPolicyConfig {
  maxAttempts: number;
  strategy: BackoffStrategy;
  baseDelayMs: number;
  maxDelayMs: number;
  multiplier?: number;
  jitterMs?: number;
  enabled: boolean;
}

export interface LegacyRetryPolicyConfig {
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  backoffDelay: number;
  failureThreshold?: number;
}

export class RetryPolicy {
  private static readonly MIN_ATTEMPTS = 0;
  private static readonly MAX_ATTEMPTS = 100;
  private static readonly MIN_DELAY = 0;
  private static readonly MAX_DELAY = 300000; // 5 minutes in ms
  private static readonly MIN_MULTIPLIER = 1.0;
  private static readonly MAX_MULTIPLIER = 10.0;

  private constructor(
    private readonly _maxAttempts: number,
    private readonly _strategy: BackoffStrategy,
    private readonly _baseDelayMs: number,
    private readonly _maxDelayMs: number,
    private readonly _multiplier: number,
    private readonly _jitterMs: number,
    private readonly _enabled: boolean
  ) {
    Object.freeze(this);
  }

  public get maxAttempts(): number {
    return this._maxAttempts;
  }

  public get strategy(): BackoffStrategy {
    return this._strategy;
  }

  public get baseDelayMs(): number {
    return this._baseDelayMs;
  }

  public get maxDelayMs(): number {
    return this._maxDelayMs;
  }

  public get multiplier(): number {
    return this._multiplier;
  }

  public get jitterMs(): number {
    return this._jitterMs;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  // Legacy property getters for backwards compatibility
  public get backoffStrategy(): BackoffStrategy {
    return this._strategy;
  }

  public get backoffDelay(): number {
    return this._baseDelayMs;
  }

  public get failureThreshold(): number {
    return this._maxAttempts; // Simple mapping for compatibility
  }

  public static createDefault(): Result<RetryPolicy> {
    return RetryPolicy.create({
      maxAttempts: 3,
      strategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      multiplier: 2.0,
      jitterMs: 0,
      enabled: true
    });
  }

  public static create(config: RetryPolicyConfig | LegacyRetryPolicyConfig): Result<RetryPolicy> {
    // Convert legacy config to new config format
    if ('backoffStrategy' in config) {
      const legacyConfig = config as LegacyRetryPolicyConfig;
      const newConfig: RetryPolicyConfig = {
        maxAttempts: legacyConfig.maxAttempts,
        strategy: legacyConfig.backoffStrategy,
        baseDelayMs: legacyConfig.backoffDelay,
        maxDelayMs: Math.max(legacyConfig.backoffDelay * 10, 30000), // Reasonable max
        multiplier: 2.0,
        jitterMs: 0,
        enabled: true
      };
      return RetryPolicy.create(newConfig);
    }

    const newConfig = config as RetryPolicyConfig;
    // Validate max attempts
    if (newConfig.maxAttempts < RetryPolicy.MIN_ATTEMPTS) {
      return Result.fail<RetryPolicy>('Max attempts must be non-negative');
    }

    if (newConfig.maxAttempts > RetryPolicy.MAX_ATTEMPTS) {
      return Result.fail<RetryPolicy>('Max attempts cannot exceed 100');
    }

    // Validate strategy
    const validStrategies: BackoffStrategy[] = ['immediate', 'linear', 'exponential'];
    if (!validStrategies.includes(newConfig.strategy)) {
      return Result.fail<RetryPolicy>('Invalid retry strategy');
    }

    // Validate delays
    if (newConfig.baseDelayMs < RetryPolicy.MIN_DELAY) {
      return Result.fail<RetryPolicy>('Base delay must be non-negative');
    }

    if (newConfig.maxDelayMs < newConfig.baseDelayMs) {
      return Result.fail<RetryPolicy>('Max delay must be greater than or equal to base delay');
    }

    if (newConfig.maxDelayMs > RetryPolicy.MAX_DELAY) {
      return Result.fail<RetryPolicy>('Max delay cannot exceed 300000ms');
    }

    // Validate multiplier
    const multiplier = newConfig.multiplier ?? 2.0;
    if (newConfig.strategy === 'exponential' && multiplier <= 1.0) {
      return Result.fail<RetryPolicy>('Multiplier must be greater than 1 for exponential strategy');
    }
    if (multiplier < RetryPolicy.MIN_MULTIPLIER || multiplier > RetryPolicy.MAX_MULTIPLIER) {
      return Result.fail<RetryPolicy>('Multiplier must be between 1.0 and 10.0');
    }

    // Validate jitter
    const jitterMs = newConfig.jitterMs ?? 0;
    if (jitterMs < 0) {
      return Result.fail<RetryPolicy>('Jitter must be non-negative');
    }

    return Result.ok<RetryPolicy>(new RetryPolicy(
      newConfig.maxAttempts,
      newConfig.strategy,
      newConfig.baseDelayMs,
      newConfig.maxDelayMs,
      multiplier,
      jitterMs,
      newConfig.enabled
    ));
  }

  public static fromObject(obj: RetryPolicyConfig): Result<RetryPolicy> {
    return RetryPolicy.create(obj);
  }

  public toLegacyObject(): RetryPolicyConfig & LegacyRetryPolicyConfig {
    return {
      // New format
      maxAttempts: this._maxAttempts,
      strategy: this._strategy,
      baseDelayMs: this._baseDelayMs,
      maxDelayMs: this._maxDelayMs,
      multiplier: this._multiplier,
      jitterMs: this._jitterMs,
      enabled: this._enabled,
      // Legacy format for backwards compatibility
      backoffStrategy: this._strategy,
      backoffDelay: this._baseDelayMs,
      failureThreshold: this._maxAttempts
    };
  }

  public calculateDelay(attempt: number): number {
    if (!this._enabled || this._strategy === 'immediate') {
      return 0;
    }

    let delay: number;

    switch (this._strategy) {
      case 'linear':
        delay = this._baseDelayMs * attempt;
        break;
      case 'exponential':
        delay = this._baseDelayMs * Math.pow(this._multiplier, attempt - 1);
        break;
      default:
        delay = this._baseDelayMs;
    }

    // Add jitter if configured
    if (this._jitterMs > 0) {
      const jitter = Math.random() * this._jitterMs;
      delay += jitter;
    }

    // Cap at max delay
    return Math.min(delay, this._maxDelayMs);
  }

  public shouldRetry(attemptNumber: number): boolean {
    if (!this._enabled) {
      return false;
    }
    return attemptNumber <= this._maxAttempts;
  }

  public equals(other: RetryPolicy): boolean {
    return (
      this._maxAttempts === other._maxAttempts &&
      this._strategy === other._strategy &&
      this._baseDelayMs === other._baseDelayMs &&
      this._maxDelayMs === other._maxDelayMs &&
      this._multiplier === other._multiplier &&
      this._jitterMs === other._jitterMs &&
      this._enabled === other._enabled
    );
  }

  public toObject(): RetryPolicyConfig {
    return {
      maxAttempts: this._maxAttempts,
      strategy: this._strategy,
      baseDelayMs: this._baseDelayMs,
      maxDelayMs: this._maxDelayMs,
      multiplier: this._multiplier,
      jitterMs: this._jitterMs,
      enabled: this._enabled,
    };
  }
}