import React from 'react';

type DefaultButtonProps = JSX.IntrinsicElements['button'];

interface LocalButtonProps {
  icon?: JSX.Element;
  circle?: boolean;
  active?: boolean;
  border?: boolean;
}

export type ButtonProps = LocalButtonProps & DefaultButtonProps;

export const Button = ({
  icon,
  circle,
  className,
  active,
  border,
  disabled,
  children,
  ...props
}: ButtonProps): JSX.Element => {
  return (
    <button
      className={`items-center  select-none flex dark:text-white ${
        active && !disabled ? 'bg-gray-100 dark:bg-gray-700' : ''
      } ${
        circle ? 'rounded-full h-10 w-10' : 'rounded-md p-3 space-x-3 text-sm'
      } ${
        disabled
          ? 'cursor-not-allowed dark:bg-primaryDark bg-white'
          : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md'
      } ${border ? 'border dark:border-gray-600' : ''} ${className}`}
      {...props}
    >
      {icon && (
        <div
          className={`text-gray-500 dark:text-gray-400 ${
            circle ? 'mx-auto' : ''
          }`}
        >
          {icon}
        </div>
      )}

      <span>{children}</span>
    </button>
  );
};
