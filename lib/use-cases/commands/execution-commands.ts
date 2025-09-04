export interface ExecuteWorkflowCommand {
  modelId: string;
  userId: string;
  parameters?: Record<string, any>;
  environment?: 'development' | 'staging' | 'production';
  dryRun?: boolean;
}

export interface PauseExecutionCommand {
  executionId: string;
  userId: string;
  pauseReason?: string;
}

export interface ResumeExecutionCommand {
  executionId: string;
  userId: string;
  resumeNotes?: string;
}

export interface StopExecutionCommand {
  executionId: string;
  userId: string;
  stopReason?: string;
}

export interface RetryFailedNodesCommand {
  executionId: string;
  nodeIds?: string[]; // If not provided, retry all failed nodes
  userId: string;
  retryReason?: string;
}