import type React from 'react';
import { useState } from 'react';

import { m } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';

export enum ButtonSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

export interface ButtonProps {
  icon?: JSX.Element;
  border?: boolean;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  size?: ButtonSize;
  onClick?: () => void;
  confirmAction?: () => void;
}

export const Button = ({
  icon,
  className,
  border,
  size = ButtonSize.Medium,
  confirmAction,
  onClick,
  disabled,
  children,
}: ButtonProps): JSX.Element => {
  const [hasConfirmed, setHasConfirmed] = useState(false);

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
    <m.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleConfirm}
      className={`flex select-none items-center space-x-3 rounded-md border border-transparent text-sm focus-within:border-primary focus-within:shadow-border dark:text-white dark:focus-within:border-primary
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
          : 'cursor-pointer hover:bg-white hover:drop-shadow-md dark:hover:bg-secondaryDark'
      } ${border ? 'border-gray-400 dark:border-gray-200' : ''} ${
        className ?? ''
      }`}
      onClickCapture={onClick}
    >
      {icon && (
        <div className="text-gray-500 dark:text-gray-400">
          {hasConfirmed ? <FiCheck /> : icon}
        </div>
      )}

      <span>{children}</span>
    </m.button>
  );
};
