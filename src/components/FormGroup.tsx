import React from 'react';

interface FormGroupProps {
  label: string;
  children: React.ReactNode;
  helpText?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({ label, children, helpText }) => {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
      {helpText && <small>{helpText}</small>}
    </div>
  );
};


