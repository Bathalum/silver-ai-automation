import { Result } from '../shared/result';

export type Environment = 'development' | 'staging' | 'production';

export class ExecutionContext {
  private constructor(
    private readonly _modelId: string,
    private readonly _executionId: string,
    private readonly _startTime: Date,
    private readonly _parameters: Record<string, any>,
    private readonly _environment: Environment,
    private readonly _userId?: string,
    private readonly _sessionId?: string
  ) {}

  public get modelId(): string {
    return this._modelId;
  }

  public get executionId(): string {
    return this._executionId;
  }

  public get startTime(): Date {
    return this._startTime;
  }

  public get parameters(): Readonly<Record<string, any>> {
    return this._parameters;
  }

  public get environment(): Environment {
    return this._environment;
  }

  public get userId(): string | undefined {
    return this._userId;
  }

  public get sessionId(): string | undefined {
    return this._sessionId;
  }

  public static create(props: {
    modelId: string;
    executionId: string;
    startTime: Date;
    parameters?: Record<string, any>;
    environment: Environment;
    userId?: string;
    sessionId?: string;
  }): Result<ExecutionContext> {
    if (!props.modelId || props.modelId.trim().length === 0) {
      return Result.fail<ExecutionContext>('Model ID is required');
    }

    if (!props.executionId || props.executionId.trim().length === 0) {
      return Result.fail<ExecutionContext>('Execution ID is required');
    }

    if (!props.startTime) {
      return Result.fail<ExecutionContext>('Start time is required');
    }

    if (props.startTime > new Date()) {
      return Result.fail<ExecutionContext>('Start time cannot be in the future');
    }

    return Result.ok<ExecutionContext>(new ExecutionContext(
      props.modelId.trim(),
      props.executionId.trim(),
      props.startTime,
      props.parameters || {},
      props.environment,
      props.userId?.trim(),
      props.sessionId?.trim()
    ));
  }

  public withParameter(key: string, value: any): ExecutionContext {
    return new ExecutionContext(
      this._modelId,
      this._executionId,
      this._startTime,
      { ...this._parameters, [key]: value },
      this._environment,
      this._userId,
      this._sessionId
    );
  }

  public withoutParameter(key: string): ExecutionContext {
    const newParams = { ...this._parameters };
    delete newParams[key];
    
    return new ExecutionContext(
      this._modelId,
      this._executionId,
      this._startTime,
      newParams,
      this._environment,
      this._userId,
      this._sessionId
    );
  }

  public getParameter<T>(key: string): T | undefined {
    return this._parameters[key] as T;
  }

  public hasParameter(key: string): boolean {
    return key in this._parameters;
  }

  public getElapsedTime(): number {
    return Date.now() - this._startTime.getTime();
  }

  public equals(other: ExecutionContext): boolean {
    return this._executionId === other._executionId;
  }

  public toObject(): {
    modelId: string;
    executionId: string;
    startTime: string;
    parameters: Record<string, any>;
    environment: Environment;
    userId?: string;
    sessionId?: string;
  } {
    return {
      modelId: this._modelId,
      executionId: this._executionId,
      startTime: this._startTime.toISOString(),
      parameters: { ...this._parameters },
      environment: this._environment,
      userId: this._userId,
      sessionId: this._sessionId,
    };
  }
}