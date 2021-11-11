import type React from 'react';

export interface LabelProps {
  label: string;
  error?: string;
}

export const Label = ({ label, error }: LabelProps): JSX.Element => (
  <label className="flex py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
    {label}
    {error && <span className="ml-2 text-red-500">{error}</span>}
    <div className="flex-grow h-0.5 my-auto ml-2 dark:bg-gray-700 bg-gray-300 rounded-full" />
  </label>
);
