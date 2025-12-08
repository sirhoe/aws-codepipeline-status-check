import { useState } from 'react';
import { PipelineStatus, PendingApproval, ApproveMessage, ApproveResponse } from '../../types';
import { getStatusColor } from '../../utils/status';
import { formatTimeAgo, formatDetailedTimeAgo } from '../../utils/date';

interface PipelineItemProps {
  pipeline: PipelineStatus;
}

async function approveAction(approval: PendingApproval): Promise<ApproveResponse> {
  const message: ApproveMessage = { type: 'approve', approval };
  return chrome.runtime.sendMessage(message);
}

export const PipelineItem = ({ pipeline }: PipelineItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const latest = pipeline.executions[0];

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!latest?.pendingApproval) return;

    setApproving(true);
    setApprovalError(null);

    try {
      const response = await approveAction(latest.pendingApproval);
      if (!response.success) {
        setApprovalError(response.error || 'Approval failed');
      }
    } catch (error: any) {
      setApprovalError(error.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  if (!latest) {
    return (
      <div className="pipeline-item">
        <div className="pipeline-header">
          <span className="pipeline-name">{pipeline.pipelineName}</span>
          <span className="status-badge" style={{ backgroundColor: '#eee', color: '#666' }}>No Executions</span>
        </div>
      </div>
    );
  }

  const hasPendingApproval = !!latest.pendingApproval;

  return (
    <div className="pipeline-item">
      <div className="pipeline-header" onClick={() => setExpanded(!expanded)}>
        <div className="pipeline-info">
          <span className="pipeline-name">{pipeline.pipelineName}</span>
          <div className="pipeline-meta">
            <span className="status-badge" style={{ backgroundColor: getStatusColor(latest.status) }}>
              {latest.status}
            </span>
            {hasPendingApproval && (
              <span className="approval-badge">Awaiting Approval</span>
            )}
            <span className="time-ago">{formatDetailedTimeAgo(latest.lastUpdateTime || latest.startTime)}</span>
          </div>
        </div>
        <div className="pipeline-actions">
          {hasPendingApproval && (
            <button
              className="approve-btn"
              onClick={handleApprove}
              disabled={approving}
              title={`Approve: ${latest.pendingApproval?.stageName} / ${latest.pendingApproval?.actionName}`}
            >
              {approving ? '...' : 'Approve'}
            </button>
          )}
          <button className="expand-btn">{expanded ? '▲' : '▼'}</button>
        </div>
      </div>

      {approvalError && (
        <div className="approval-error">{approvalError}</div>
      )}

      {expanded && (
        <div className="pipeline-history">
          {pipeline.executions.map((exec) => (
            <div key={exec.pipelineExecutionId} className="history-item">
              <div className="history-status">
                <span className="status-dot" style={{ backgroundColor: getStatusColor(exec.status) }}></span>
                {exec.status}
              </div>
              <span className="history-time">
                {formatTimeAgo(exec.lastUpdateTime || exec.startTime)} ({new Date(exec.lastUpdateTime || exec.startTime || '').toLocaleTimeString()})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
