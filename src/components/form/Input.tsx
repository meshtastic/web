import React from 'react';

type DefaultInputProps = JSX.IntrinsicElements['input'];

export interface InputProps {
  valid?: boolean;
  validationMessage?: string;
  icon?: JSX.Element;
  label: string;
}

export const Input = React.forwardRef<
  HTMLInputElement,
  InputProps & DefaultInputProps
>(function Input(
  {
    valid,
    validationMessage,
    icon,
    label,
    id,
    ...props
  }: InputProps & DefaultInputProps,
  ref,
) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium dark:text-white">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="flex absolute inset-y-0 left-0 px-3 items-center pointer-events-none">
            {React.cloneElement(icon, {
              className: 'w-5 h-5 text-gray-500 dark:text-gray-600',
            })}
          </div>
        )}
        <input
          ref={ref}
          {...props}
          className={`block w-full h-11 rounded-md border shadow-sm focus:outline-none focus:border-primary dark:focus:border-primary dark:bg-secondaryDark dark:border-gray-600 dark:text-white ${
            icon ? 'pl-9' : 'pl-2'
          }`}
        />
      </div>
      {!valid && (
        <div className="text-sm text-gray-600">{validationMessage}</div>
      )}
    </div>
  );
});
