import { DomainEvent } from './domain-event';

export class ExecutionStarted extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly modelId: string,
    public readonly executionId: string,
    public readonly startedBy: string,
    public readonly context: Record<string, any>,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ExecutionStarted';
  }

  public getEventData(): Record<string, any> {
    return {
      modelId: this.modelId,
      executionId: this.executionId,
      startedBy: this.startedBy,
      context: this.context,
    };
  }
}

export class NodeExecuted extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly executionId: string,
    public readonly nodeId: string,
    public readonly nodeName: string,
    public readonly success: boolean,
    public readonly executionTime: number,
    public readonly output?: any,
    public readonly error?: string,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'NodeExecuted';
  }

  public getEventData(): Record<string, any> {
    return {
      executionId: this.executionId,
      nodeId: this.nodeId,
      nodeName: this.nodeName,
      success: this.success,
      executionTime: this.executionTime,
      output: this.output,
      error: this.error,
    };
  }
}

export class ExecutionPaused extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly executionId: string,
    public readonly pausedBy: string,
    public readonly currentProgress: number,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ExecutionPaused';
  }

  public getEventData(): Record<string, any> {
    return {
      executionId: this.executionId,
      pausedBy: this.pausedBy,
      currentProgress: this.currentProgress,
    };
  }
}

export class ExecutionResumed extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly executionId: string,
    public readonly resumedBy: string,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ExecutionResumed';
  }

  public getEventData(): Record<string, any> {
    return {
      executionId: this.executionId,
      resumedBy: this.resumedBy,
    };
  }
}

export class ExecutionCompleted extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly executionId: string,
    public readonly success: boolean,
    public readonly totalExecutionTime: number,
    public readonly completedNodes: string[],
    public readonly failedNodes: string[],
    public readonly finalOutput?: any,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ExecutionCompleted';
  }

  public getEventData(): Record<string, any> {
    return {
      executionId: this.executionId,
      success: this.success,
      totalExecutionTime: this.totalExecutionTime,
      completedNodes: this.completedNodes,
      failedNodes: this.failedNodes,
      finalOutput: this.finalOutput,
    };
  }
}

export class ExecutionFailed extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly executionId: string,
    public readonly failureReason: string,
    public readonly failedNodeId?: string,
    public readonly failedNodeName?: string,
    public readonly executionTime?: number,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ExecutionFailed';
  }

  public getEventData(): Record<string, any> {
    return {
      executionId: this.executionId,
      failureReason: this.failureReason,
      failedNodeId: this.failedNodeId,
      failedNodeName: this.failedNodeName,
      executionTime: this.executionTime,
    };
  }
}