export interface Settings {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  roleArn?: string;
  pipelineFilter?: string;
  refreshIntervalMs: number;
}

export interface PipelineExecutionSummary {
  pipelineExecutionId: string;
  status: string;
  startTime?: string;
  lastUpdateTime?: string;
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

