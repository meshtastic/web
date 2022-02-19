import React from 'react';

import { Label } from '@components/generic/form/Label';

type DefaultInputProps = JSX.IntrinsicElements['input'];

export interface CheckboxProps extends DefaultInputProps {
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
      <div className="flex w-full flex-col">
        <Label label={label} />
        <div className="ml-auto">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={`h-8 w-8 appearance-none rounded-md border border-gray-400 transition duration-200 ease-in-out checked:border-transparent checked:bg-primary focus-within:shadow-border focus:outline-none dark:border-gray-200 ${
              props.disabled
                ? 'border-gray-400 bg-gray-300 text-gray-500 dark:border-gray-700 dark:bg-secondaryDark dark:text-gray-400'
                : ''
            } ${
              error
                ? 'border-red-500'
                : props.disabled
                ? 'border-gray-200'
                : 'focus-within:border-primary hover:border-primary dark:focus-within:border-primary dark:hover:border-primary'
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
