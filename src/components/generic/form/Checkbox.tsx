import React from 'react';

import { Label } from './Label.jsx';

type DefaultInputProps = JSX.IntrinsicElements['input'];

interface CheckboxProps extends DefaultInputProps {
  action?: (enabled: boolean) => void;
  label: string;
  valid?: boolean;
  validationMessage?: string;
  error?: boolean;
}

export const Checkbox = ({
  label,
  valid,
  validationMessage,
  id,
  error,
  ...props
}: CheckboxProps): JSX.Element => {
  return (
    <div className="flex flex-col w-full">
      <Label label={label} />
      <div className="ml-auto">
        <input
          type="checkbox"
          id={id}
          className={`appearance-none w-8 h-8 border rounded-md focus:outline-none checked:bg-primary checked:border-transparent ${
            props.disabled
              ? 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-400'
              : ''
          } ${
            error
              ? 'border-red-500'
              : props.disabled
              ? 'border-gray-200'
              : ' focus-within:border-primary hover:border-primary'
          }`}
          {...props}
        />
      </div>
      {!valid && (
        <div className="text-sm text-gray-600">{validationMessage}</div>
      )}
    </div>
  );
};
