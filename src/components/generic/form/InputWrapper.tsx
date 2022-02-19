import type React from 'react';

export interface LabelProps {
  error?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export const InputWrapper = ({
  error,
  disabled,
  children,
}: LabelProps): JSX.Element => (
  <div
    className={`flex w-full rounded-md border border-gray-400 transition duration-200 ease-in-out dark:border-gray-200 ${
      disabled
        ? 'border-gray-400 bg-gray-300 text-gray-500 dark:border-gray-700 dark:bg-secondaryDark dark:text-gray-400'
        : ''
    } ${
      error
        ? 'border-red-500 dark:border-red-500'
        : disabled
        ? ''
        : ' focus-within:border-primary focus-within:shadow-border hover:border-primary dark:focus-within:border-primary dark:hover:border-primary'
    }`}
  >
    {children}
  </div>
);
