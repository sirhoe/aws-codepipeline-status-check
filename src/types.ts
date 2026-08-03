export interface Settings {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  roleArn?: string;
  pipelineFilters?: string[];
  refreshIntervalMs: number;
}

export interface PendingApproval {
  pipelineName: string;
  stageName: string;
  actionName: string;
  token: string;
}

export type StageExecutionType = 'STANDARD' | 'ROLLBACK';

export interface StageStatusSummary {
  stageName: string;
  status: string;
  type?: StageExecutionType;
}

export interface PipelineExecutionSummary {
  pipelineExecutionId: string;
  status: string;
  startTime?: string;
  lastUpdateTime?: string;
  triggerType?: string;
  executionType?: StageExecutionType;
  pendingApproval?: PendingApproval;
}

export interface PipelineStatus {
  pipelineName: string;
  executions: PipelineExecutionSummary[];
  stages: StageStatusSummary[];
}

export interface PipelineStatusState {
  lastUpdated: string;
  pipelines: PipelineStatus[];
  totalPipelines?: number;
  matchedPipelines?: number;
  error?: string;
}

export type RefreshMessage = {
  type: 'refreshNow';
};

export type ApproveMessage = {
  type: 'approve';
  approval: PendingApproval;
};

export type RefreshResponse = {
  success: boolean;
  error?: string;
};

export type ApproveResponse = {
  success: boolean;
  error?: string;
};
