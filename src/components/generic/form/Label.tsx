import React from 'react';

export interface LabelProps {
  label: string;
  error?: string;
}

export const Label = ({ label, error }: LabelProps): JSX.Element => (
  <label className="text-xs font-semibold text-gray-500">
    {label}
    {error && <span className="ml-2 text-red-500">{error}</span>}
  </label>
);
