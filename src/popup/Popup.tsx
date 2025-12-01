import { useEffect } from 'react';
import { usePipelineStatus } from '../hooks/usePipelineStatus';
import { useSettings } from '../hooks/useSettings';
import { Header } from './components/Header';
import { EmptyState } from './components/EmptyState';
import { PipelineItem } from './components/PipelineItem';

export const Popup = () => {
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const { statusState, isLoading: isStatusLoading, refresh, isRefreshing } = usePipelineStatus();

  const openOptions = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  };

  // Trigger initial refresh if no data and settings are valid
  useEffect(() => {
    if (!isStatusLoading && !statusState && settings?.accessKeyId) {
      refresh();
    }
  }, [isStatusLoading, statusState, settings, refresh]);

  const isLoading = isStatusLoading || isRefreshing;
  const configured = !isSettingsLoading && settings?.accessKeyId && settings?.secretAccessKey && settings?.region;

  if (!isSettingsLoading && !configured) {
    return (
      <EmptyState
        title="Welcome!"
        message="Please configure your AWS credentials to get started."
        action={{ label: "Open Settings", onClick: openOptions }}
        className="empty-state"
      />
    );
  }

  return (
    <div className="container">
      <Header 
        lastUpdated={statusState?.lastUpdated} 
        isLoading={isLoading} 
        onRefresh={() => refresh()} 
      />

      {statusState?.error && (
        <div className="error-banner">
          {statusState.error}
        </div>
      )}

      {statusState && (
        <div className="pipelines-summary">
          <span>Total pipelines: {statusState.totalPipelines ?? statusState.pipelines.length}</span>
          <span>Matched filter: {statusState.matchedPipelines ?? statusState.pipelines.length}</span>
        </div>
      )}

      <div className="content">
        {!statusState && !isLoading && <div className="empty-message">No data available.</div>}
        
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
