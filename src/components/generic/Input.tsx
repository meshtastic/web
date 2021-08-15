import React from 'react';

type DefaultInputProps = JSX.IntrinsicElements['input'];

interface LocalInputProps {
  icon?: JSX.Element;
  label?: string;
  valid?: boolean;
  validationMessage?: string;
}

export type InputProps = LocalInputProps & DefaultInputProps;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { icon, label, valid, validationMessage, id, ...props }: InputProps,
    ref,
  ) {
    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className="block text-sm font-medium dark:text-white"
        >
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none">
              {React.cloneElement(icon, {
                className: 'w-5 h-5 text-gray-500 dark:text-gray-600',
              })}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            {...props}
            className={`block w-full h-11 rounded-md border shadow-sm focus:outline-none focus:border-primary dark:focus:border-primary bg-white dark:bg-secondaryDark dark:border-gray-600 dark:text-white ${
              icon ? 'pl-9' : 'pl-2'
            }`}
          />
        </div>
        {!valid && (
          <div className="text-sm text-gray-600">{validationMessage}</div>
        )}
      </div>
    );
  },
);
