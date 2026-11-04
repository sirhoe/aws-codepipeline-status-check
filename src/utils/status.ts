import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from '../constants';
import { PipelineExecutionSummary, PipelineStatus, StageExecutionType, StageStatusSummary } from '../types';

const STAGE_PRIORITY = ['Failed', 'Stopping', 'Stopped', 'Cancelled', 'InProgress'] as const;

export const getStatusColor = (status: string) => {
  return STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
};

export function parseStageExecutionType(value?: string): StageExecutionType | undefined {
  return value === 'STANDARD' || value === 'ROLLBACK' ? value : undefined;
}

export function isRollbackStage(stage: StageStatusSummary): boolean {
  return stage.type === 'ROLLBACK';
}

export function isRollbackExecution(execution: PipelineExecutionSummary): boolean {
  return (
    execution.executionType === 'ROLLBACK' ||
    execution.triggerType === 'AutomatedRollback' ||
    execution.triggerType === 'ManualRollback'
  );
}

function formatStatusLabel(status: string, isRollback: boolean): string {
  return isRollback ? `${status} (Rollback)` : status;
}

export function getStageDisplayLabel(stage: StageStatusSummary): string {
  return formatStatusLabel(stage.status, isRollbackStage(stage));
}

export function getExecutionDisplayLabel(execution: PipelineExecutionSummary): string {
  return formatStatusLabel(execution.status, isRollbackExecution(execution));
}

export function getStageColorStatus(stage: StageStatusSummary): string {
  return isRollbackStage(stage) ? 'RolledBack' : stage.status;
}

export function getExecutionColorStatus(execution: PipelineExecutionSummary): string {
  return isRollbackExecution(execution) ? 'RolledBack' : execution.status;
}

export function getPipelineLastUpdated(pipeline: PipelineStatus): number {
  const latest = pipeline.executions[0];
  const time = latest?.lastUpdateTime || latest?.startTime;
  if (!time) return 0;
  const ms = new Date(time).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function hasUnsuccessfulStage(stages: StageStatusSummary[]): boolean {
  return stages.some(stage => (stage.status !== 'Unknown' && stage.status !== 'Succeeded') || isRollbackStage(stage));
}

export function getPipelineDisplayStatus(
  stages: StageStatusSummary[],
  latestExecution?: PipelineExecutionSummary
): string {
  if (stages.length > 0) {
    for (const status of STAGE_PRIORITY) {
      if (stages.some(stage => stage.status === status)) return status;
    }
    if (stages.some(isRollbackStage)) return 'RolledBack';
  }

  return latestExecution?.status || 'Unknown';
}
