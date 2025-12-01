import React from 'react';

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, action, className }) => {
  return (
    <div className={`container empty-state ${className || ''}`}>
      {title && <h3>{title}</h3>}
      <p>{message}</p>
      {action && (
        <button className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};


