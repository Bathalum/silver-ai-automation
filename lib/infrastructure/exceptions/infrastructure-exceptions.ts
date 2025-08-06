// Infrastructure Exceptions
// This file implements the exception types for the infrastructure layer

export class InfrastructureException extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'InfrastructureException'
  }
}

export class DatabaseConnectionException extends InfrastructureException {
  constructor(message: string, details?: any) {
    super(message, 'DB_CONNECTION_ERROR', 503, details)
    this.name = 'DatabaseConnectionException'
  }
}

export class ExternalServiceException extends InfrastructureException {
  constructor(
    message: string,
    public service: string,
    public endpoint: string,
    details?: any
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, details)
    this.name = 'ExternalServiceException'
  }
}

export class DataConsistencyException extends InfrastructureException {
  constructor(message: string, public entityId: string, details?: any) {
    super(message, 'DATA_CONSISTENCY_ERROR', 409, details)
    this.name = 'DataConsistencyException'
  }
}

export class PerformanceException extends InfrastructureException {
  constructor(message: string, public metric: string, details?: any) {
    super(message, 'PERFORMANCE_ERROR', 503, details)
    this.name = 'PerformanceException'
  }
}

export class ValidationException extends InfrastructureException {
  constructor(message: string, public field: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationException'
  }
}

export class NotFoundException extends InfrastructureException {
  constructor(message: string, public resource: string, details?: any) {
    super(message, 'NOT_FOUND_ERROR', 404, details)
    this.name = 'NotFoundException'
  }
}

export class UnauthorizedException extends InfrastructureException {
  constructor(message: string, public resource: string, details?: any) {
    super(message, 'UNAUTHORIZED_ERROR', 401, details)
    this.name = 'UnauthorizedException'
  }
}

export class ForbiddenException extends InfrastructureException {
  constructor(message: string, public resource: string, details?: any) {
    super(message, 'FORBIDDEN_ERROR', 403, details)
    this.name = 'ForbiddenException'
  }
}

export class RateLimitException extends InfrastructureException {
  constructor(message: string, public service: string, details?: any) {
    super(message, 'RATE_LIMIT_ERROR', 429, details)
    this.name = 'RateLimitException'
  }
}

export class TimeoutException extends InfrastructureException {
  constructor(message: string, public operation: string, details?: any) {
    super(message, 'TIMEOUT_ERROR', 408, details)
    this.name = 'TimeoutException'
  }
} 