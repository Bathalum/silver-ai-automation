// Domain Exceptions
// This file contains domain-specific exception classes

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export class NodeValidationError extends DomainError {
  constructor(message: string, public readonly nodeId: string) {
    super(message)
    this.name = 'NodeValidationError'
  }
}

export class LinkValidationError extends DomainError {
  constructor(message: string, public readonly linkId: string) {
    super(message)
    this.name = 'LinkValidationError'
  }
}

export class AIAgentError extends DomainError {
  constructor(message: string, public readonly agentId: string) {
    super(message)
    this.name = 'AIAgentError'
  }
}

export class CrossFeatureLinkError extends DomainError {
  constructor(message: string, public readonly sourceFeature: string, public readonly targetFeature: string) {
    super(message)
    this.name = 'CrossFeatureLinkError'
  }
}

export class FunctionModelNodeValidationError extends DomainError {
  constructor(message: string, public readonly nodeId: string) {
    super(message)
    this.name = 'FunctionModelNodeValidationError'
  }
}

export class FunctionModelValidationError extends DomainError {
  constructor(message: string, public readonly modelId: string) {
    super(message)
    this.name = 'FunctionModelValidationError'
  }
}

export class StageValidationError extends DomainError {
  constructor(message: string, public readonly stageId: string) {
    super(message)
    this.name = 'StageValidationError'
  }
}

export class ActionItemValidationError extends DomainError {
  constructor(message: string, public readonly actionId: string) {
    super(message)
    this.name = 'ActionItemValidationError'
  }
}

export class DataPortValidationError extends DomainError {
  constructor(message: string, public readonly portId: string) {
    super(message)
    this.name = 'DataPortValidationError'
  }
}

export class RACIMatrixValidationError extends DomainError {
  constructor(message: string, public readonly matrixId: string) {
    super(message)
    this.name = 'RACIMatrixValidationError'
  }
}

export class NodeNotFoundError extends DomainError {
  constructor(message: string, public readonly nodeId: string) {
    super(message)
    this.name = 'NodeNotFoundError'
  }
}

export class InvalidOperationError extends DomainError {
  constructor(message: string, public readonly operation: string) {
    super(message)
    this.name = 'InvalidOperationError'
  }
} 