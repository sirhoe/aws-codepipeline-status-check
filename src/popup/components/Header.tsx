import React from 'react';

interface HeaderProps {
  lastUpdated?: string;
  isLoading: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ lastUpdated, isLoading, onRefresh }) => {
  return (
    <header>
      <h1>CodePipeline Status</h1>
      <div className="header-actions">
        {lastUpdated && (
          <span className="last-updated" title={lastUpdated}>
            {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
        {isLoading && <span style={{ fontSize: '12px', color: '#ccc' }}>loading ...</span>}
        <button className="refresh-btn" onClick={onRefresh} disabled={isLoading}>
          ↻
        </button>
      </div>
    </header>
  );
};

