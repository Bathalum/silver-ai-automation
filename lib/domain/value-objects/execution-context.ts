import { Result } from '../shared/result';

export type Environment = 'development' | 'staging' | 'production' | 'test';

export class ExecutionContext {
  private constructor(
    private readonly _environment: Environment,
    private readonly _parameters: Readonly<Record<string, any>>,
    private readonly _sessionId: string,
    private readonly _createdAt: Date
  ) {
    Object.freeze(this);
  }

  public get environment(): Environment {
    return this._environment;
  }

  public get parameters(): Readonly<Record<string, any>> {
    return this._parameters;
  }

  public get sessionId(): string {
    return this._sessionId;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public static create(
    environment: Environment | string,
    parameters: Record<string, any> = {},
    sessionId?: string
  ): Result<ExecutionContext> {
    // Validate environment
    if (!environment || typeof environment !== 'string' || environment.trim().length === 0) {
      return Result.fail<ExecutionContext>('Environment cannot be empty');
    }

    const env = environment.trim();
    const validEnvironments: Environment[] = ['development', 'staging', 'production', 'test'];
    if (!validEnvironments.includes(env as Environment)) {
      return Result.fail<ExecutionContext>('Invalid environment. Must be development, staging, production, or test');
    }

    // Validate session ID if provided
    if (sessionId !== undefined) {
      if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        return Result.fail<ExecutionContext>('Session ID cannot be empty');
      }
    }

    // Generate session ID if not provided
    const finalSessionId = sessionId?.trim() || `exec-session-${crypto.randomUUID()}`;

    // Validate parameters
    if (!parameters || typeof parameters !== 'object') {
      return Result.fail<ExecutionContext>('Parameters must be an object');
    }

    return Result.ok<ExecutionContext>(new ExecutionContext(
      env as Environment,
      Object.freeze({ ...parameters }),
      finalSessionId,
      new Date()
    ));
  }

  public addParameter(key: string, value: any): Result<ExecutionContext> {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return Result.fail<ExecutionContext>('Parameter key cannot be empty');
    }

    const newParams = { ...this._parameters, [key.trim()]: value };
    return Result.ok<ExecutionContext>(new ExecutionContext(
      this._environment,
      Object.freeze(newParams),
      this._sessionId,
      this._createdAt
    ));
  }

  public removeParameter(key: string): Result<ExecutionContext> {
    const newParams = { ...this._parameters };
    delete newParams[key];
    
    const newContext = new ExecutionContext(
      this._environment,
      Object.freeze(newParams),
      this._sessionId,
      this._createdAt
    );
    
    return Result.ok<ExecutionContext>(newContext);
  }

  public updateParameters(parameters: Record<string, any>): Result<ExecutionContext> {
    // Merge with existing parameters
    const mergedParams = { ...this._parameters, ...parameters };
    const newContext = new ExecutionContext(
      this._environment,
      Object.freeze(mergedParams),
      this._sessionId,
      this._createdAt
    );
    
    return Result.ok<ExecutionContext>(newContext);
  }

  public replaceParameters(parameters: Record<string, any>): Result<ExecutionContext> {
    // Replace all parameters completely
    const newContext = new ExecutionContext(
      this._environment,
      Object.freeze({ ...parameters }),
      this._sessionId,
      this._createdAt
    );
    
    return Result.ok<ExecutionContext>(newContext);
  }

  public clearParameters(): Result<ExecutionContext> {
    const newContext = new ExecutionContext(
      this._environment,
      Object.freeze({}),
      this._sessionId,
      this._createdAt
    );
    
    return Result.ok<ExecutionContext>(newContext);
  }

  public getParameter<T>(key: string): T | undefined {
    return this._parameters[key] as T;
  }

  public hasParameter(key: string): boolean {
    return key in this._parameters;
  }

  public getParameterKeys(): string[] {
    return Object.keys(this._parameters);
  }

  public getParameterCount(): number {
    return Object.keys(this._parameters).length;
  }

  public equals(other: ExecutionContext): boolean {
    if (this._environment !== other._environment || this._sessionId !== other._sessionId) {
      return false;
    }

    const thisKeys = Object.keys(this._parameters).sort();
    const otherKeys = Object.keys(other._parameters).sort();
    
    if (thisKeys.length !== otherKeys.length) {
      return false;
    }

    return thisKeys.every(key => this._parameters[key] === other._parameters[key]);
  }

  public toString(): string {
    const paramCount = this.getParameterCount();
    const paramInfo = paramCount === 0 ? ' with 0 parameters' : ` with ${paramCount} parameters`;
    return `ExecutionContext[${this._environment}:${this._sessionId}]${paramInfo}`;
  }

  public toObject(): {
    environment: Environment;
    parameters: Record<string, any>;
    sessionId: string;
    createdAt: Date;
  } {
    return {
      environment: this._environment,
      parameters: { ...this._parameters },
      sessionId: this._sessionId,
      createdAt: this._createdAt,
    };
  }

  public static fromObject(obj: {
    environment: Environment;
    parameters: Record<string, any>;
    sessionId: string;
    createdAt: Date | string;
  }): Result<ExecutionContext> {
    if (!obj || typeof obj !== 'object') {
      return Result.fail<ExecutionContext>('Invalid object provided');
    }

    // Validate environment first (for specific error message)
    if (!obj.environment || typeof obj.environment !== 'string' || obj.environment.trim().length === 0) {
      return Result.fail<ExecutionContext>('Environment cannot be empty');
    }

    if (!obj.sessionId) {
      return Result.fail<ExecutionContext>('Missing required properties: environment and sessionId');
    }

    try {
      let createdAt: Date;
      if (obj.createdAt instanceof Date) {
        createdAt = obj.createdAt;
      } else {
        createdAt = new Date(obj.createdAt);
        if (isNaN(createdAt.getTime())) {
          return Result.fail<ExecutionContext>('Invalid createdAt date');
        }
      }

      const context = new ExecutionContext(
        obj.environment,
        Object.freeze({ ...obj.parameters }),
        obj.sessionId,
        createdAt
      );

      return Result.ok<ExecutionContext>(context);
    } catch (error) {
      return Result.fail<ExecutionContext>('Failed to deserialize ExecutionContext');
    }
  }
}