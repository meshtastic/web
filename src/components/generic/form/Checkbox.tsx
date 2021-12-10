import React from 'react';

import { Label } from './Label';

type DefaultInputProps = JSX.IntrinsicElements['input'];

interface CheckboxProps extends DefaultInputProps {
  action?: (enabled: boolean) => void;
  label: string;
  valid?: boolean;
  validationMessage?: string;
  error?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Input(
    { label, valid, validationMessage, id, error, ...props }: CheckboxProps,
    ref,
  ) {
    return (
      <div className="flex flex-col w-full">
        <Label label={label} />
        <div className="ml-auto">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={`appearance-none w-8 h-8 border rounded-md focus:outline-none focus-within:shadow-border checked:bg-primary checked:border-transparent transition duration-200 ease-in-out border-gray-400 dark:border-gray-200 ${
              props.disabled
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-400 dark:border-gray-700'
                : ''
            } ${
              error
                ? 'border-red-500'
                : props.disabled
                ? 'border-gray-200'
                : 'focus-within:border-primary dark:focus-within:border-primary hover:border-primary dark:hover:border-primary'
            }`}
            {...props}
          />
        </div>
        {!valid && (
          <div className="text-sm text-gray-600">{validationMessage}</div>
        )}
      </div>
    );
  },
);
