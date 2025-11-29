import { useEffect, useState } from 'react';
import { getPipelineStatus, getSettings } from '../storage';
import { PipelineStatusState, PipelineStatus } from '../types';

const STATUS_COLORS: Record<string, string> = {
  'Succeeded': '#28a745',
  'Failed': '#dc3545',
  'InProgress': '#fd7e14',
  'Stopped': '#6c757d',
  'Cancelled': '#6c757d',
  'Superseded': '#6c757d'
};

const getStatusColor = (status: string) => {
  return STATUS_COLORS[status] || '#6c757d'; // Default grey
};

const formatTimeAgo = (isoString?: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const PipelineItem = ({ pipeline }: { pipeline: PipelineStatus }) => {
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
               <span className="history-time">{formatTimeAgo(exec.lastUpdateTime || exec.startTime)} ({new Date(exec.lastUpdateTime || exec.startTime || '').toLocaleTimeString()})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Popup = () => {
  const [statusState, setStatusState] = useState<PipelineStatusState | null>(null);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    checkConfigAndLoad();
    
    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local' && changes.pipelineStatus) {
        setStatusState(changes.pipelineStatus.newValue);
        setLoading(false);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const checkConfigAndLoad = async () => {
    const settings = await getSettings();
    if (!settings.accessKeyId || !settings.secretAccessKey || !settings.region) {
      setConfigured(false);
      return;
    }
    
    const status = await getPipelineStatus();
    if (status) {
      setStatusState(status);
    } else {
      // Initial fetch if no data
      handleRefresh();
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ type: 'refreshNow' }, () => {
       // The background worker sends response when done, but we also rely on storage listener
       // This just handles the trigger.
       if (chrome.runtime.lastError) {
           console.error("Error sending message:", chrome.runtime.lastError);
           setLoading(false);
       }
    });
  };

  const openOptions = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  };

  if (!configured) {
    return (
      <div className="container empty-state">
        <h3>Welcome!</h3>
        <p>Please configure your AWS credentials to get started.</p>
        <button className="btn-primary" onClick={openOptions}>Open Settings</button>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>CodePipeline Status</h1>
        <div className="header-actions">
             {statusState?.lastUpdated && (
                 <span className="last-updated" title={statusState.lastUpdated}>
                    {new Date(statusState.lastUpdated).toLocaleTimeString()}
                 </span>
             )}
             <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
               {loading ? '↻...' : '↻'}
             </button>
        </div>
      </header>

      {statusState?.error && (
        <div className="error-banner">
          {statusState.error}
        </div>
      )}

      <div className="content">
        {!statusState && !loading && <div className="empty-message">No data available.</div>}
        
        {statusState?.pipelines.length === 0 && !statusState.error && (
           <div className="empty-message">No pipelines found. Check your region and filters.</div>
        )}

        {statusState?.pipelines.map((pipeline) => (
          <PipelineItem key={pipeline.pipelineName} pipeline={pipeline} />
        ))}
      </div>
      
      <footer>
        <button className="link-btn" onClick={openOptions}>Settings</button>
      </footer>
    </div>
  );
};

