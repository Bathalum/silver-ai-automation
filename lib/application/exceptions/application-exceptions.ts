// Application Exceptions
// This file contains application-specific exceptions following the application layer guide

export class ApplicationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'ApplicationError'
  }
}

export class NodeExecutionError extends ApplicationError {
  constructor(message: string, public readonly nodeId: string, public readonly nodeType: string) {
    super(message)
    this.name = 'NodeExecutionError'
  }
}

export class CrossNodeLinkError extends ApplicationError {
  constructor(message: string, public readonly sourceNodeType: string, public readonly targetNodeType: string) {
    super(message)
    this.name = 'CrossNodeLinkError'
  }
}

export class AIAgentExecutionError extends ApplicationError {
  constructor(message: string, public readonly agentId: string, public readonly nodeId: string) {
    super(message)
    this.name = 'AIAgentExecutionError'
  }
}

export class WorkflowExecutionError extends ApplicationError {
  constructor(message: string, public readonly workflowId: string) {
    super(message)
    this.name = 'WorkflowExecutionError'
  }
}

// Function Model specific exceptions
export class FunctionModelNodeError extends ApplicationError {
  constructor(message: string, public readonly nodeId: string, public readonly modelId: string) {
    super(message)
    this.name = 'FunctionModelNodeError'
  }
}

export class FunctionModelValidationError extends ApplicationError {
  constructor(message: string, public readonly modelId: string, public readonly validationErrors: string[]) {
    super(message)
    this.name = 'FunctionModelValidationError'
  }
}

export class FunctionModelVersionError extends ApplicationError {
  constructor(message: string, public readonly modelId: string, public readonly version: string) {
    super(message)
    this.name = 'FunctionModelVersionError'
  }
}

export class CrossFeatureLinkError extends ApplicationError {
  constructor(message: string, public readonly sourceFeature: string, public readonly targetFeature: string) {
    super(message)
    this.name = 'CrossFeatureLinkError'
  }
} 