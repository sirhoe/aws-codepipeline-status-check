export interface Settings {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  roleArn?: string;
  pipelineFilter?: string;
  refreshIntervalMs: number;
}

export interface PendingApproval {
  pipelineName: string;
  stageName: string;
  actionName: string;
  token: string;
}

export interface PipelineExecutionSummary {
  pipelineExecutionId: string;
  status: string;
  startTime?: string;
  lastUpdateTime?: string;
  pendingApproval?: PendingApproval;
}

export interface PipelineStatus {
  pipelineName: string;
  executions: PipelineExecutionSummary[];
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
