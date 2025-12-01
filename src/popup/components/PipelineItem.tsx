import { useState } from 'react';
import { PipelineStatus } from '../../types';
import { getStatusColor } from '../../utils/status';
import { formatTimeAgo } from '../../utils/date';

interface PipelineItemProps {
  pipeline: PipelineStatus;
}

export const PipelineItem = ({ pipeline }: PipelineItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const latest = pipeline.executions[0];

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

  return (
    <div className="pipeline-item">
      <div className="pipeline-header" onClick={() => setExpanded(!expanded)}>
        <div className="pipeline-info">
          <span className="pipeline-name">{pipeline.pipelineName}</span>
          <div className="pipeline-meta">
            <span className="status-badge" style={{ backgroundColor: getStatusColor(latest.status) }}>
              {latest.status}
            </span>
            <span className="time-ago">{formatTimeAgo(latest.lastUpdateTime || latest.startTime)}</span>
          </div>
        </div>
        <button className="expand-btn">{expanded ? '▲' : '▼'}</button>
      </div>

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

