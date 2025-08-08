// Application Layer Exceptions
// This file defines exceptions specific to the Application Layer
// Following the Application Layer Complete Guide

export class ApplicationException extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly context: Record<string, any>

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context: Record<string, any> = {}
  ) {
    super(message)
    this.name = 'ApplicationException'
    this.code = code
    this.statusCode = statusCode
    this.context = context
  }
}

export class VersionRestorationException extends ApplicationException {
  constructor(
    message: string,
    context: Record<string, any> = {}
  ) {
    super(message, 'VERSION_RESTORATION_ERROR', 500, context)
    this.name = 'VersionRestorationException'
  }
}

export class ModelNotFoundException extends ApplicationException {
  constructor(
    modelId: string,
    context: Record<string, any> = {}
  ) {
    super(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND', 404, { modelId, ...context })
    this.name = 'ModelNotFoundException'
  }
}

export class VersionDataInvalidException extends ApplicationException {
  constructor(
    message: string,
    context: Record<string, any> = {}
  ) {
    super(message, 'VERSION_DATA_INVALID', 400, context)
    this.name = 'VersionDataInvalidException'
  }
} 