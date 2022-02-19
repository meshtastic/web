import React from 'react';

import { FiCheck } from 'react-icons/fi';

type DefaultButtonProps = JSX.IntrinsicElements['button'];

export enum ButtonSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

export interface ButtonProps extends DefaultButtonProps {
  icon?: JSX.Element;
  active?: boolean;
  border?: boolean;
  size?: ButtonSize;
  confirmAction?: () => void;
}

export const Button = ({
  icon,
  className,
  active,
  border,
  size = ButtonSize.Medium,
  confirmAction,
  disabled,
  children,
  ...props
}: ButtonProps): JSX.Element => {
  const [hasConfirmed, setHasConfirmed] = React.useState(false);

  const handleConfirm = (): void => {
    if (typeof confirmAction == 'function') {
      if (hasConfirmed) {
        void confirmAction();
      }
      setHasConfirmed(true);
      setTimeout(() => {
        setHasConfirmed(false);
      }, 3000);
    }
  };

  return (
    <button
      onClick={handleConfirm}
      className={`flex select-none items-center space-x-3 rounded-md border border-transparent text-sm transition duration-200 ease-in-out focus-within:border-primary focus-within:shadow-border active:scale-95 dark:text-white dark:focus-within:border-primary
        ${
          size === ButtonSize.Small
            ? 'p-0'
            : size === ButtonSize.Medium
            ? 'p-2'
            : 'p-4'
        }
      ${
        disabled
          ? 'cursor-not-allowed bg-white dark:bg-primaryDark'
          : 'cursor-pointer hover:bg-gray-100 hover:shadow-md dark:hover:bg-secondaryDark'
      } ${border ? 'border-gray-400 dark:border-gray-200' : ''} ${className}`}
      {...props}
    >
      {icon && (
        <div className="text-gray-500 dark:text-gray-400">
          {hasConfirmed ? <FiCheck /> : icon}
        </div>
      )}

      <span>{children}</span>
    </button>
  );
};
